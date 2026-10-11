// Bounded in-memory activity logger for Vex-M Admin
const MAX_LOGS = 250;
const logs = [];

function logActivity(action, details = {}, ip = '127.0.0.1') {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    ip,
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  return entry;
}

function getLogs(limit = 100) {
  return logs.slice(0, Math.min(limit, MAX_LOGS));
}

function clearLogs() {
  logs.length = 0;
  logActivity('LOGS_CLEARED', { description: 'Activity logs cleared by administrator' });
}

// Initial system start entry
logActivity('SYSTEM_START', { description: 'Vex-M backend service initialized' });

module.exports = {
  logActivity,
  getLogs,
  clearLogs,
};
