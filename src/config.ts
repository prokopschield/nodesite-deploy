import { getConfig } from 'doge-config';

export const config = getConfig('nodesite-deploy', {
	name: 'deploy',
	port: 22099,

	pids_limit: 20,
	mem_limit: '120m',
});

export const name = config.str.name;
export const port = config.num.port;

export const pids_limit = config.num.pids_limit;
export const mem_limit = config.str.mem_limit;
