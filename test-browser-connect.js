#!/usr/bin/env node

/**
 * Test script for Edge auto-launch and CDP connection
 * Run with: node test-browser-connect.js
 */

import CDP from 'chrome-remote-interface';
import { spawn } from 'child_process';
import fs from 'fs';

const chromePort = 9222;
const elementSelector = '.test-element';

async function testBrowserConnection() {
	console.log('🧪 Testing Edge auto-launch and CDP connection...\n');
	
	let client;
	
	try {
		// Try to connect to existing browser
		console.log('📡 Attempting to connect to existing browser on port', chromePort, '...');
		try {
			client = await CDP({ port: chromePort });
			console.log('✅ Connected to existing browser!\n');
		} catch (connectError) {
			console.log('❌ No browser found:', connectError.message);
			console.log('\n🚀 Auto-launching Edge...\n');
			
			// Auto-launch Edge with debugging - use full path
			const possiblePaths = [
				'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
				'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
			];
			
			let edgePath = 'msedge.exe'; // fallback
			for (const path of possiblePaths) {
				if (fs.existsSync(path)) {
					edgePath = path;
					break;
				}
			}
			
			const args = [
				'--remote-debugging-port=' + chromePort,
				'--user-data-dir=' + process.env.TEMP + '\\edge-debug-' + chromePort,
				'about:blank'
			];
			
			console.log('Command:', edgePath, args.join(' '));
			
			const proc = spawn(edgePath, args, { 
				detached: true, 
				stdio: 'ignore' 
			});
			proc.unref();
			
			console.log('⏱️  Waiting for Edge to start (with exponential backoff)...\n');
			
			// Retry connection with exponential backoff
			let connected = false;
			for (let attempt = 1; attempt <= 5; attempt++) {
				const waitTime = attempt * 1000;
				console.log(`   Attempt ${attempt}/5: Waiting ${waitTime}ms...`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
				
				try {
					client = await CDP({ port: chromePort });
					console.log(`   ✅ Connected on attempt ${attempt}!\n`);
					connected = true;
					break;
				} catch (retryError) {
					console.log(`   ❌ Attempt ${attempt} failed: ${retryError.message}`);
					
					if (attempt === 5) {
						console.log('\n❌ FAILED: Could not connect after 5 attempts (waited 15 seconds total)\n');
						console.log('Troubleshooting:');
						console.log('  1. Check if Edge is already running normally (close it first)');
						console.log('  2. Try manually: msedge.exe --remote-debugging-port=9222');
						console.log('  3. Check if port 9222 is in use: netstat -ano | findstr :9222');
						console.log('  4. Try a different port (e.g., 9223)');
						process.exit(1);
					}
				}
			}
			
			if (!connected) {
				console.log('\n❌ Connection failed\n');
				process.exit(1);
			}
		}
		
		// Test DOM access
		console.log('🔍 Testing DOM access...');
		const { DOM, CSS } = client;
		
		await DOM.enable();
		console.log('   ✅ DOM enabled');
		
		await CSS.enable();
		console.log('   ✅ CSS enabled');
		
		const { root } = await DOM.getDocument();
		console.log('   ✅ Got root document (nodeId:', root.nodeId + ')');
		
		// Try to query for an element (will fail on about:blank, but tests the API)
		try {
			const { nodeId } = await DOM.querySelector({
				nodeId: root.nodeId,
				selector: 'body',
			});
			console.log('   ✅ Found body element (nodeId:', nodeId + ')');
		} catch (e) {
			console.log('   ⚠️  Could not find body (expected on blank page)');
		}
		
		console.log('\n✅ ALL TESTS PASSED!');
		console.log('\nThe browser connection is working correctly.');
		console.log('The MCP server should be able to connect successfully.\n');
		
		await client.close();
		console.log('🔌 Disconnected from browser\n');
		
		process.exit(0);
		
	} catch (error) {
		console.error('\n❌ TEST FAILED:', error.message);
		console.error('\nFull error:', error);
		
		if (client) {
			try {
				await client.close();
			} catch (e) {
				// Ignore
			}
		}
		
		process.exit(1);
	}
}

testBrowserConnection();
