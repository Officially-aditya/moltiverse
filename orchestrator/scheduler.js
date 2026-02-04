/**
 * Scheduler
 *
 * Timing, sequencing, and periodic task management
 */

// =============================================================================
// SCHEDULER CLASS
// =============================================================================

class Scheduler {
  constructor(config = {}) {
    this.tasks = new Map();
    this.intervals = new Map();
    this.timeouts = new Map();
    this.eventHandler = config.eventHandler;
    this.conversionTracker = config.conversionTracker;
  }

  /**
   * Schedule a one-time task
   */
  scheduleOnce(taskId, callback, delayMs) {
    // Cancel existing if present
    this.cancel(taskId);

    const timeout = setTimeout(async () => {
      this.timeouts.delete(taskId);
      try {
        await callback();
      } catch (e) {
        console.error(`Scheduled task ${taskId} error:`, e);
      }
    }, delayMs);

    this.timeouts.set(taskId, {
      timeout,
      scheduledFor: Date.now() + delayMs,
      callback
    });

    return taskId;
  }

  /**
   * Schedule a recurring task
   */
  scheduleRecurring(taskId, callback, intervalMs, options = {}) {
    // Cancel existing if present
    this.cancel(taskId);

    const task = {
      intervalMs,
      callback,
      lastRun: null,
      runCount: 0,
      maxRuns: options.maxRuns || Infinity
    };

    // Run immediately if specified
    if (options.immediate) {
      this._runTask(taskId, task);
    }

    const interval = setInterval(async () => {
      if (task.runCount >= task.maxRuns) {
        this.cancel(taskId);
        return;
      }
      await this._runTask(taskId, task);
    }, intervalMs);

    task.interval = interval;
    this.intervals.set(taskId, task);

    return taskId;
  }

  /**
   * Run a scheduled task
   */
  async _runTask(taskId, task) {
    task.lastRun = Date.now();
    task.runCount++;

    try {
      await task.callback();
    } catch (e) {
      console.error(`Recurring task ${taskId} error:`, e);
    }
  }

  /**
   * Cancel a scheduled task
   */
  cancel(taskId) {
    // Cancel timeout
    const timeout = this.timeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout.timeout);
      this.timeouts.delete(taskId);
    }

    // Cancel interval
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval.interval);
      this.intervals.delete(taskId);
    }
  }

  /**
   * Cancel all scheduled tasks
   */
  cancelAll() {
    for (const [taskId] of this.timeouts) {
      this.cancel(taskId);
    }
    for (const [taskId] of this.intervals) {
      this.cancel(taskId);
    }
  }

  /**
   * Get scheduled task info
   */
  getTaskInfo(taskId) {
    const timeout = this.timeouts.get(taskId);
    if (timeout) {
      return {
        type: 'once',
        scheduledFor: timeout.scheduledFor,
        remainingMs: Math.max(0, timeout.scheduledFor - Date.now())
      };
    }

    const interval = this.intervals.get(taskId);
    if (interval) {
      return {
        type: 'recurring',
        intervalMs: interval.intervalMs,
        lastRun: interval.lastRun,
        runCount: interval.runCount,
        nextRun: interval.lastRun ? interval.lastRun + interval.intervalMs : Date.now()
      };
    }

    return null;
  }

  /**
   * List all scheduled tasks
   */
  listTasks() {
    const tasks = [];

    for (const [taskId] of this.timeouts) {
      tasks.push({ taskId, ...this.getTaskInfo(taskId) });
    }

    for (const [taskId] of this.intervals) {
      tasks.push({ taskId, ...this.getTaskInfo(taskId) });
    }

    return tasks;
  }

  // ===========================================================================
  // PRE-BUILT SCHEDULED TASKS
  // ===========================================================================

  /**
   * Start daily belief decay job
   */
  startDecayJob(intervalHours = 24) {
    return this.scheduleRecurring(
      'belief_decay',
      () => {
        if (this.conversionTracker) {
          this.conversionTracker.applyDecayToAll(intervalHours / 24);

          if (this.eventHandler) {
            this.eventHandler.emit({
              type: 'decayApplied',
              intervalHours
            });
          }
        }
      },
      intervalHours * 60 * 60 * 1000
    );
  }

  /**
   * Start metrics reporting job
   */
  startReportingJob(intervalMinutes = 60, callback) {
    return this.scheduleRecurring(
      'metrics_report',
      () => {
        if (this.conversionTracker && callback) {
          const report = this.conversionTracker.generateReport();
          callback(report);
        }
      },
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Schedule follow-up message for a target
   */
  scheduleFollowUp(targetId, callback, delayMs) {
    return this.scheduleOnce(
      `followup_${targetId}`,
      callback,
      delayMs
    );
  }

  /**
   * Cancel follow-up for a target
   */
  cancelFollowUp(targetId) {
    this.cancel(`followup_${targetId}`);
  }

  /**
   * Schedule re-engagement for inactive targets
   */
  startReengagementJob(inactivityThresholdMs, callback, checkIntervalMs = 60000) {
    return this.scheduleRecurring(
      'reengagement_check',
      () => {
        if (!this.conversionTracker) return;

        const now = Date.now();
        const targets = this.conversionTracker.tracker?.targets || new Map();

        for (const [targetId, target] of targets) {
          if (target.conversionStatus === 'converted') continue;

          const lastActivity = target.beliefState?.lastInteractionTime || target.createdAt;
          if (now - lastActivity > inactivityThresholdMs) {
            callback(targetId, target);
          }
        }
      },
      checkIntervalMs
    );
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = Scheduler;
