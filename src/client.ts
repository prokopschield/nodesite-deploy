import EventEmitter from 'events';
import connect from 'nodesite.eu-core';
import { store } from 'nodesite-storedir';

export async function client(
	directory: string,
	command: string = 'pnpm start'
) {
	const hash = directory.match(/^[\w~]{43}$/g)
		? directory
		: await store(directory, /node_modules/);

	const endpoint = process.env.ENDPOINT || 'wss://deploy.nodesite.eu';
	const socket = connect(endpoint);

	socket.on(
		'init',
		(init: (command: string, env: string, script: string) => void) => {
			init('deploy', hash, command);
		}
	);

	socket.on('stdout', (chunk: Buffer, cb: Function) =>
		cb(process.stdout.write(chunk))
	);

	socket.on('stderr', (chunk: Buffer, cb: Function) =>
		cb(process.stderr.write(chunk))
	);

	return socket as unknown as EventEmitter;
}
