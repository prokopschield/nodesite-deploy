#!/usr/bin/env node

import nsblob from 'nsblob';
import { client } from './client';

if (process.argv[2] === '--server') {
	require('./server');
} else {
	client('.', process.argv.slice(2).join(' ') || undefined).then((client) =>
		client.on('exit', () => nsblob.socket.close())
	);
}
