import { ChildProcess, exec } from 'child_process';
import EventEmitter from 'events';
import nsblob from 'nsblob';

import { mem_limit, pids_limit } from '../config';

export class Deployment extends EventEmitter {
	private _process?: ChildProcess;

	private _stdout = new Array<Buffer | string>();
	private _stderr = new Array<Buffer | string>();

	private _dead = false;

	constructor(env: string, script: string) {
		super();

		this.init(env, script);
	}

	async init(env: string, script: string) {
		const script_hash = await nsblob.store(String(script));

		const hash = await nsblob.store(
			[
				`nodesite-storedir ${env}`,
				'pnpm install 1>/dev/null 2>/dev/null',
				`nodesite-cdn cat ${script_hash} | bash`,
				'',
			].join('\n')
		);

		this._process = exec(
			`docker run --rm -c 3 --pids-limit=${pids_limit} --memory="${mem_limit}" -i -w /app node sh -c "1>/dev/null 2>/dev/null yarn global add pnpm nodesite-storedir nodesite-cdn; nodesite-cdn cat ${hash} | bash"`
		);

		this._process.stdout?.on('data', (chunk: Buffer) => {
			this._stdout.push(chunk);
			this.emit('stdout');
		});

		this._process.stderr?.on('data', (chunk: Buffer) => {
			this._stderr.push(chunk);
			this.emit('stderr');
		});

		this._process.on('exit', () => this.emit('exit', (this._dead = true)));
	}

	get dead() {
		return (this._dead ||= !this._process?.killed);
	}

	get stdout() {
		return this._stdout.shift();
	}

	get stderr() {
		return this._stderr.shift();
	}

	get is_waiting() {
		return !!(this._stdout.length || this._stderr.length);
	}

	kill() {
		this._process?.kill();
	}
}
