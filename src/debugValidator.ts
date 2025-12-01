/**
 * Debug Validator - Robust fix validation for Node/React backend debugging
 * 
 * Capabilities:
 * - Run Jest tests and parse results
 * - Monitor server health
 * - Read JSON log files
 * - Validate API endpoints
 * - Automatic rollback on failure
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// =====================================================
// TYPES
// =====================================================

export interface ValidationResult {
	success: boolean;
	phase: string;
	details: {
		testsPassed?: boolean;
		testOutput?: string;
		serverRunning?: boolean;
		serverPort?: number;
		apiResponding?: boolean;
		apiLatency?: number;
		noNewErrors?: boolean;
		errorCount?: number;
		logs?: LogEntry[];
	};
	errors: string[];
}

export interface LogEntry {
	timestamp: string;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
	stack?: string;
	metadata?: any;
}

export interface TestResult {
	passed: boolean;
	failed: boolean;
	total: number;
	passedCount: number;
	failedCount: number;
	errors: string[];
	output: string;
	duration: number;
}

export interface ServerHealth {
	running: boolean;
	port: number;
	responding: boolean;
	latency: number;
	errorRate: number;
}

export interface FixAttempt {
	id: string;
	description: string;
	files: FileChange[];
	timestamp: Date;
	validation?: ValidationResult;
}

export interface FileChange {
	path: string;
	originalContent: string;
	newContent: string;
}

// =====================================================
// JEST TEST RUNNER
// =====================================================

export class JestTestRunner {
	private workspaceRoot: string;
	
	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}
	
	/**
	 * Run Jest tests and parse results
	 */
	async runTests(testPath?: string): Promise<TestResult> {
		const startTime = Date.now();
		
		try {
			// Build Jest command
			const jestCmd = testPath 
				? `npm test -- ${testPath} --json --coverage=false --verbose=false`
				: `npm test -- --json --coverage=false --verbose=false`;
			
			// Run tests via terminal
			const output = await this.executeCommand(jestCmd);
			const duration = Date.now() - startTime;
			
			// Parse Jest JSON output
			return this.parseJestOutput(output, duration);
			
		} catch (error) {
			return {
				passed: false,
				failed: true,
				total: 0,
				passedCount: 0,
				failedCount: 0,
				errors: [error instanceof Error ? error.message : String(error)],
				output: '',
				duration: Date.now() - startTime
			};
		}
	}
	
	/**
	 * Parse Jest JSON output
	 */
	private parseJestOutput(output: string, duration: number): TestResult {
		try {
			// Jest --json outputs JSON on last line
			const lines = output.split('\n');
			const jsonLine = lines.find(line => line.trim().startsWith('{'));
			
			if (!jsonLine) {
				// Fallback to text parsing
				return this.parseJestTextOutput(output, duration);
			}
			
			const jestResult = JSON.parse(jsonLine);
			
			return {
				passed: jestResult.success === true,
				failed: jestResult.success === false,
				total: jestResult.numTotalTests || 0,
				passedCount: jestResult.numPassedTests || 0,
				failedCount: jestResult.numFailedTests || 0,
				errors: this.extractErrors(jestResult),
				output: output,
				duration: duration
			};
			
		} catch (error) {
			// Fallback to text parsing
			return this.parseJestTextOutput(output, duration);
		}
	}
	
	/**
	 * Fallback: Parse Jest text output
	 */
	private parseJestTextOutput(output: string, duration: number): TestResult {
		const passedMatch = output.match(/(\d+) passed/);
		const failedMatch = output.match(/(\d+) failed/);
		const totalMatch = output.match(/Tests:\s+.*?(\d+) total/);
		
		const passedCount = passedMatch ? parseInt(passedMatch[1]) : 0;
		const failedCount = failedMatch ? parseInt(failedMatch[1]) : 0;
		const total = totalMatch ? parseInt(totalMatch[1]) : passedCount + failedCount;
		
		// Extract error messages
		const errors: string[] = [];
		const errorBlocks = output.split('●').slice(1); // Split by bullet points
		
		for (const block of errorBlocks) {
			const lines = block.split('\n');
			if (lines.length > 0) {
				errors.push(lines[0].trim());
			}
		}
		
		return {
			passed: failedCount === 0 && passedCount > 0,
			failed: failedCount > 0,
			total: total,
			passedCount: passedCount,
			failedCount: failedCount,
			errors: errors,
			output: output,
			duration: duration
		};
	}
	
	/**
	 * Extract error messages from Jest JSON result
	 */
	private extractErrors(jestResult: any): string[] {
		const errors: string[] = [];
		
		if (jestResult.testResults) {
			for (const testFile of jestResult.testResults) {
				if (testFile.message) {
					errors.push(testFile.message);
				}
				
				if (testFile.assertionResults) {
					for (const assertion of testFile.assertionResults) {
						if (assertion.status === 'failed' && assertion.failureMessages) {
							errors.push(...assertion.failureMessages);
						}
					}
				}
			}
		}
		
		return errors;
	}
	
	/**
	 * Execute terminal command and capture output
	 */
	private async executeCommand(command: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const { exec } = require('child_process');
			
			exec(command, { cwd: this.workspaceRoot, maxBuffer: 10 * 1024 * 1024 }, (error: any, stdout: string, stderr: string) => {
				// Jest returns exit code 1 on test failures, but still outputs results
				// So we resolve with output even if there's an "error"
				const output = stdout + stderr;
				
				if (error && !output.includes('Tests:')) {
					reject(error);
				} else {
					resolve(output);
				}
			});
		});
	}
}

// =====================================================
// SERVER MONITOR
// =====================================================

export class ServerMonitor {
	private serverUrl: string;
	private healthEndpoint: string;
	
	constructor(serverUrl: string = 'http://localhost:3000', healthEndpoint: string = '/health') {
		this.serverUrl = serverUrl;
		this.healthEndpoint = healthEndpoint;
	}
	
	/**
	 * Check if server is running and responding
	 */
	async checkHealth(): Promise<ServerHealth> {
		const startTime = Date.now();
		
		try {
			const response = await this.makeRequest(this.serverUrl + this.healthEndpoint);
			const latency = Date.now() - startTime;
			
			return {
				running: true,
				port: this.extractPort(this.serverUrl),
				responding: response.statusCode === 200,
				latency: latency,
				errorRate: 0
			};
			
		} catch (error) {
			return {
				running: false,
				port: this.extractPort(this.serverUrl),
				responding: false,
				latency: -1,
				errorRate: 1
			};
		}
	}
	
	/**
	 * Test API endpoint
	 */
	async testEndpoint(endpoint: string, method: string = 'GET', body?: any): Promise<{ success: boolean; status: number; latency: number; response?: any; error?: string }> {
		const startTime = Date.now();
		
		try {
			const response = await this.makeRequest(this.serverUrl + endpoint, method, body);
			const latency = Date.now() - startTime;
			
			return {
				success: response.statusCode >= 200 && response.statusCode < 300,
				status: response.statusCode,
				latency: latency,
				response: response.body
			};
			
		} catch (error) {
			return {
				success: false,
				status: 0,
				latency: Date.now() - startTime,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	
	/**
	 * Make HTTP request
	 */
	private async makeRequest(url: string, method: string = 'GET', body?: any): Promise<{ statusCode: number; body: any }> {
		return new Promise((resolve, reject) => {
			const urlObj = new URL(url);
			
			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || 3000,
				path: urlObj.pathname + urlObj.search,
				method: method,
				timeout: 5000,
				headers: {
					'Content-Type': 'application/json'
				}
			};
			
			const req = http.request(options, (res) => {
				let data = '';
				
				res.on('data', (chunk) => {
					data += chunk;
				});
				
				res.on('end', () => {
					let parsedBody;
					try {
						parsedBody = JSON.parse(data);
					} catch {
						parsedBody = data;
					}
					
					resolve({
						statusCode: res.statusCode || 0,
						body: parsedBody
					});
				});
			});
			
			req.on('error', (error) => {
				reject(error);
			});
			
			req.on('timeout', () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});
			
			if (body) {
				req.write(JSON.stringify(body));
			}
			
			req.end();
		});
	}
	
	/**
	 * Extract port from URL
	 */
	private extractPort(url: string): number {
		try {
			const urlObj = new URL(url);
			return parseInt(urlObj.port) || 3000;
		} catch {
			return 3000;
		}
	}
}

// =====================================================
// LOG FILE READER
// =====================================================

export class LogFileReader {
	private workspaceRoot: string;
	private logDirectory: string;
	
	constructor(workspaceRoot: string, logDirectory: string = 'logs') {
		this.workspaceRoot = workspaceRoot;
		this.logDirectory = logDirectory;
	}
	
	/**
	 * Find all JSON log files
	 */
	async findLogFiles(): Promise<string[]> {
		const logDir = path.join(this.workspaceRoot, this.logDirectory);
		
		if (!fs.existsSync(logDir)) {
			return [];
		}
		
		const files = fs.readdirSync(logDir);
		return files
			.filter(f => f.endsWith('.json') || f.endsWith('.log'))
			.map(f => path.join(logDir, f));
	}
	
	/**
	 * Read and parse log files
	 */
	async readLogs(maxEntries: number = 100): Promise<LogEntry[]> {
		const logFiles = await this.findLogFiles();
		const allLogs: LogEntry[] = [];
		
		for (const logFile of logFiles) {
			const logs = await this.parseLogFile(logFile);
			allLogs.push(...logs);
		}
		
		// Sort by timestamp (newest first)
		allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
		
		return allLogs.slice(0, maxEntries);
	}
	
	/**
	 * Get error logs only
	 */
	async getErrors(since?: Date): Promise<LogEntry[]> {
		const allLogs = await this.readLogs(1000);
		
		return allLogs.filter(log => {
			const isError = log.level === 'error';
			const isRecent = since ? new Date(log.timestamp) >= since : true;
			return isError && isRecent;
		});
	}
	
	/**
	 * Compare errors before and after fix
	 */
	async compareErrors(beforeTime: Date, afterTime: Date): Promise<{ newErrors: LogEntry[]; resolvedErrors: number }> {
		const beforeErrors = await this.getErrors(beforeTime);
		const afterErrors = await this.getErrors(afterTime);
		
		// Find new errors (errors that appear after fix)
		const newErrors = afterErrors.filter(afterLog => {
			// Check if this error message existed before
			return !beforeErrors.some(beforeLog => 
				beforeLog.message === afterLog.message
			);
		});
		
		const resolvedErrors = beforeErrors.length - afterErrors.length;
		
		return {
			newErrors: newErrors,
			resolvedErrors: Math.max(0, resolvedErrors)
		};
	}
	
	/**
	 * Parse log file (supports JSON and newline-delimited JSON)
	 */
	private async parseLogFile(filePath: string): Promise<LogEntry[]> {
		const content = fs.readFileSync(filePath, 'utf-8');
		const logs: LogEntry[] = [];
		
		// Try parsing as JSON array
		try {
			const parsed = JSON.parse(content);
			if (Array.isArray(parsed)) {
				return parsed.map(entry => this.normalizeLogEntry(entry));
			} else {
				return [this.normalizeLogEntry(parsed)];
			}
		} catch {
			// Try parsing as newline-delimited JSON
			const lines = content.split('\n').filter(line => line.trim());
			
			for (const line of lines) {
				try {
					const entry = JSON.parse(line);
					logs.push(this.normalizeLogEntry(entry));
				} catch {
					// Skip invalid lines
				}
			}
		}
		
		return logs;
	}
	
	/**
	 * Normalize log entry to standard format
	 */
	private normalizeLogEntry(entry: any): LogEntry {
		return {
			timestamp: entry.timestamp || entry.time || entry.date || new Date().toISOString(),
			level: entry.level || entry.severity || 'info',
			message: entry.message || entry.msg || entry.text || JSON.stringify(entry),
			stack: entry.stack || entry.stackTrace,
			metadata: entry.metadata || entry.meta
		};
	}
}

// =====================================================
// FIX VALIDATOR (ORCHESTRATOR)
// =====================================================

export class FixValidator {
	private workspaceRoot: string;
	private testRunner: JestTestRunner;
	private serverMonitor: ServerMonitor;
	private logReader: LogFileReader;
	private fixHistory: FixAttempt[] = [];
	
	constructor(workspaceRoot: string, serverUrl?: string, logDirectory?: string) {
		this.workspaceRoot = workspaceRoot;
		this.testRunner = new JestTestRunner(workspaceRoot);
		this.serverMonitor = new ServerMonitor(serverUrl);
		this.logReader = new LogFileReader(workspaceRoot, logDirectory);
	}
	
	/**
	 * MAIN VALIDATION WORKFLOW
	 * 
	 * 1. Capture baseline state
	 * 2. Apply fix
	 * 3. Wait for changes to propagate
	 * 4. Run tests
	 * 5. Check server health
	 * 6. Compare logs
	 * 7. Test API endpoints
	 * 8. Return validation result
	 */
	async validateFix(fix: FixAttempt, affectedEndpoints?: string[]): Promise<ValidationResult> {
		const startTime = Date.now();
		
		try {
			// PHASE 1: Capture baseline
			const baselineErrors = await this.logReader.getErrors(new Date(Date.now() - 60000)); // Last 1 min
			
			// PHASE 2: Apply fix (caller should do this, but we track it)
			this.fixHistory.push(fix);
			
			// PHASE 3: Wait for changes to propagate
			await this.waitForStabilization();
			
			// PHASE 4: Run tests
			const testResult = await this.testRunner.runTests();
			
			// PHASE 5: Check server health
			const serverHealth = await this.serverMonitor.checkHealth();
			
			// PHASE 6: Compare logs
			const errorComparison = await this.logReader.compareErrors(
				new Date(Date.now() - 60000),
				new Date()
			);
			
			// PHASE 7: Test API endpoints (if provided)
			const apiResults = [];
			if (affectedEndpoints) {
				for (const endpoint of affectedEndpoints) {
					const result = await this.serverMonitor.testEndpoint(endpoint);
					apiResults.push(result);
				}
			}
			
			// PHASE 8: Validate results
			const allApiPassed = apiResults.length === 0 || apiResults.every(r => r.success);
			const noNewErrors = errorComparison.newErrors.length === 0;
			
			const success = 
				testResult.passed && 
				serverHealth.running && 
				serverHealth.responding &&
				allApiPassed &&
				noNewErrors;
			
			const validationResult: ValidationResult = {
				success: success,
				phase: 'complete',
				details: {
					testsPassed: testResult.passed,
					testOutput: testResult.output,
					serverRunning: serverHealth.running,
					serverPort: serverHealth.port,
					apiResponding: serverHealth.responding,
					apiLatency: serverHealth.latency,
					noNewErrors: noNewErrors,
					errorCount: errorComparison.newErrors.length,
					logs: errorComparison.newErrors
				},
				errors: [
					...testResult.errors,
					...errorComparison.newErrors.map(e => e.message),
					...apiResults.filter(r => !r.success).map(r => r.error || `Endpoint failed with status ${r.status}`)
				]
			};
			
			// Store validation result
			fix.validation = validationResult;
			
			return validationResult;
			
		} catch (error) {
			return {
				success: false,
				phase: 'error',
				details: {},
				errors: [error instanceof Error ? error.message : String(error)]
			};
		}
	}
	
	/**
	 * Wait for server restart and file changes to propagate
	 */
	private async waitForStabilization(maxWaitMs: number = 5000): Promise<void> {
		const startTime = Date.now();
		
		while (Date.now() - startTime < maxWaitMs) {
			const health = await this.serverMonitor.checkHealth();
			
			if (health.running && health.responding) {
				// Wait a bit more to ensure stability
				await new Promise(resolve => setTimeout(resolve, 1000));
				return;
			}
			
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}
	
	/**
	 * Get fix history
	 */
	getFixHistory(): FixAttempt[] {
		return this.fixHistory;
	}
	
	/**
	 * Get last successful fix
	 */
	getLastSuccessfulFix(): FixAttempt | null {
		for (let i = this.fixHistory.length - 1; i >= 0; i--) {
			if (this.fixHistory[i].validation?.success) {
				return this.fixHistory[i];
			}
		}
		return null;
	}
}
