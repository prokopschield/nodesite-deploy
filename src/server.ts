import * as Json from 'doge-json';
import { listen } from 'nodesite.eu-local';
import { Server, Socket } from 'socket.io';
import { Deployment } from './classes';

import { name, port } from './config';

const { create, server } = listen({
	interface: 'http',
	name,
	port,
});

const ioserver = new Server(server);

const map_hash_deployment = new Map<string, Deployment>();

const map_deployment_socket = new WeakMap<Deployment, Socket>();
const map_socket_deployment = new WeakMap<Socket, Deployment>();

function createDeployment(socket: Socket, hash: string, script: string) {
	const deployment = new Deployment(hash, script);

	map_hash_deployment.set(hash, deployment);
	map_deployment_socket.set(deployment, socket);
	map_socket_deployment.set(socket, deployment);

	return deployment;
}

function getDeployment(socket: Socket, hash: string) {
	const deployment = map_hash_deployment.get(hash);

	if (!deployment) {
		return;
	}

	map_deployment_socket.set(deployment, socket);
	map_socket_deployment.set(socket, deployment);

	return deployment;
}

ioserver.on('connection', (socket: Socket) => {
	socket.emit(
		'init',
		(command: 'deploy' | 'listen', hash: string, script: string) => {
			if (!hash.match(/^[\w~]{43}$/g)) {
				return socket.disconnect();
			}

			const deployment =
				command === 'deploy'
					? createDeployment(socket, hash, script)
					: getDeployment(socket, hash);

			if (deployment) {
				deployment.removeAllListeners();

				const send_stdout = () => {
					if (socket.connected) {
						const data = deployment.stdout;

						if (data) {
							socket.emit('stdout', data, send_stdout);
						}
					}
				};

				const send_stderr = () => {
					if (socket.connected) {
						const data = deployment.stderr;

						if (data) {
							socket.emit('stderr', data, send_stderr);
						}
					}
				};

				deployment.on('stdout', send_stdout);
				deployment.on('stderr', send_stderr);

				send_stdout();
				send_stderr();

				deployment.on('exit', () => {
					while (socket.connected && deployment.is_waiting) {
						send_stderr();
						send_stdout();
					}
					if (socket.connected) {
						socket.emit('exit');

						deployment.removeAllListeners();

						map_socket_deployment.delete(socket);
						map_deployment_socket.delete(deployment);
						map_hash_deployment.delete(hash);

						socket.disconnect();
					}
				});
			} else {
				socket.emit('exit');
				socket.disconnect();
			}
		}
	);
});

create('/', () => ({
	statusCode: 200,
	head: {
		'content-type': 'application/json',
	},
	body: Json.encode({
		deployments: map_hash_deployment.size,
	}),
}));
