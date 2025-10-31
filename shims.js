// shims.js
import { Buffer } from 'buffer';
import process from 'process';

// Avoid polluting global too much, stick to globalThis
globalThis.Buffer = Buffer;
globalThis.process = process;
