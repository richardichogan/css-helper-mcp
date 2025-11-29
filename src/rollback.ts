/**
 * Rollback Manager - Automatic rollback of failed fixes
 */

import * as fs from 'fs';
import * as path from 'path';

export interface RollbackPoint {
	id: string;
	timestamp: Date;
	description: string;
	files: FileSnapshot[];
}

export interface FileSnapshot {
	path: string;
	content: string;
	exists: boolean;
}

export class RollbackManager {
	private rollbackPoints: Map<string, RollbackPoint> = new Map();
	private workspaceRoot: string;
	
	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}
	
	/**
	 * Create a rollback point before applying fix
	 */
	async createRollbackPoint(filePaths: string[], description: string): Promise<string> {
		const id = `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		const snapshots: FileSnapshot[] = [];
		
		for (const filePath of filePaths) {
			const absolutePath = path.isAbsolute(filePath) 
				? filePath 
				: path.join(this.workspaceRoot, filePath);
			
			const exists = fs.existsSync(absolutePath);
			const content = exists ? fs.readFileSync(absolutePath, 'utf-8') : '';
			
			snapshots.push({
				path: absolutePath,
				content: content,
				exists: exists
			});
		}
		
		const rollbackPoint: RollbackPoint = {
			id: id,
			timestamp: new Date(),
			description: description,
			files: snapshots
		};
		
		this.rollbackPoints.set(id, rollbackPoint);
		
		return id;
	}
	
	/**
	 * Rollback to a specific point
	 */
	async rollback(rollbackId: string): Promise<{ success: boolean; filesRestored: number; errors: string[] }> {
		const rollbackPoint = this.rollbackPoints.get(rollbackId);
		
		if (!rollbackPoint) {
			return {
				success: false,
				filesRestored: 0,
				errors: [`Rollback point ${rollbackId} not found`]
			};
		}
		
		const errors: string[] = [];
		let filesRestored = 0;
		
		for (const snapshot of rollbackPoint.files) {
			try {
				if (snapshot.exists) {
					// Restore file content
					fs.writeFileSync(snapshot.path, snapshot.content, 'utf-8');
					filesRestored++;
				} else {
					// File didn't exist before, delete it
					if (fs.existsSync(snapshot.path)) {
						fs.unlinkSync(snapshot.path);
						filesRestored++;
					}
				}
			} catch (error) {
				errors.push(`Failed to restore ${snapshot.path}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		
		return {
			success: errors.length === 0,
			filesRestored: filesRestored,
			errors: errors
		};
	}
	
	/**
	 * Get all rollback points
	 */
	getRollbackPoints(): RollbackPoint[] {
		return Array.from(this.rollbackPoints.values())
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}
	
	/**
	 * Delete old rollback points (keep last N)
	 */
	cleanup(keepLast: number = 10): void {
		const points = this.getRollbackPoints();
		
		if (points.length <= keepLast) {
			return;
		}
		
		// Delete old points
		for (let i = keepLast; i < points.length; i++) {
			this.rollbackPoints.delete(points[i].id);
		}
	}
	
	/**
	 * Get specific rollback point
	 */
	getRollbackPoint(id: string): RollbackPoint | undefined {
		return this.rollbackPoints.get(id);
	}
}
