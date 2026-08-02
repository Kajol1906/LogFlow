import { useEffect, useState, useMemo, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import { Activity, AlertTriangle, Cpu, Search, Filter, Server, ShieldAlert, BarChart2, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ─── Reusable Accordion Section ─── */
function AccordionSection({ id, title, icon, isOpen, onToggle, children, sectionRef }) {
  return (
    <div ref={sectionRef} className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-zinc-100 uppercase tracking-wider hover:bg-zinc-800/30 transition-colors focus:outline-none"
      >
        <span className="flex items-center">
          {icon}
          {title}
        </span>
        {isOpen
          ? <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform" />
          : <ChevronRight className="w-4 h-4 text-zinc-400 transition-transform" />
        }
      </button>
      <div
        className="transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? '2000px' : '0px',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
        }}
      >
        <div className="px-5 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ─── */
function App() {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [openAccordions, setOpenAccordions] = useState({
    chart: true,
    services: true,
    monitors: false,
    alerts: true,
  });

  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({
    ruleName: '', serviceName: '', condition: 'ERROR_COUNT',
    threshold: 5, windowMinutes: 5, severity: 'CRITICAL', active: true,
  });

  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // Refs for scroll-to-section
  const leftColumnRef = useRef(null);
  const servicesRef = useRef(null);
  const monitorsRef = useRef(null);

  /* ─── Effects ─── */
  useEffect(() => {
    fetchLogs();
    fetchRules();

    const socket = new SockJS(API_URL + '/ws/alerts');
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log('Connected to WebSocket');
        client.subscribe('/topic/alerts', (msg) => {
          if (msg.body) {
            const alert = JSON.parse(msg.body);
            setAlerts((prev) => [alert, ...prev]);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      },
    });

    client.activate();
    setStompClient(client);

    return () => client.deactivate();
  }, []);

  /* ─── Data Fetchers ─── */
  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/logs/search?size=500`);
      setLogs(res.data.content || []);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/alerts/rules`);
      setRules(res.data || []);
    } catch (e) { console.error('Failed to fetch rules', e); }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/v1/alerts/rules`, newRule);
      fetchRules();
      setNewRule({ ruleName: '', serviceName: '', condition: 'ERROR_COUNT', threshold: 5, windowMinutes: 5, severity: 'CRITICAL', active: true });
    } catch (e) { console.error('Failed to create rule', e); }
  };

  const handleDeleteRule = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/v1/alerts/rules/${id}`);
      fetchRules();
    } catch (e) { console.error('Failed to delete rule', e); }
  };

  /* ─── Accordion Toggle ─── */
  const toggleAccordion = (key) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /* ─── Scroll-to shortcuts for header buttons ─── */
  const scrollToSection = (key, ref) => {
    setOpenAccordions(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  /* ─── Computed Data ─── */
  const filteredLogs = logs.filter(log =>
    (log.message?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const chartData = useMemo(() => {
    let error = 0, warn = 0, info = 0;
    logs.forEach(l => {
      if (l.level === 'ERROR') error++;
      else if (l.level === 'WARN') warn++;
      else info++;
    });
    return [
      { name: 'INFO', count: info, color: '#3b82f6' },
      { name: 'WARN', count: warn, color: '#f59e0b' },
      { name: 'ERROR', count: error, color: '#ef4444' },
    ];
  }, [logs]);

  const uniqueServices = useMemo(() => {
    const counts = {};
    logs.forEach(l => {
      if (l.serviceName) {
        counts[l.serviceName] = (counts[l.serviceName] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  /* ─── Intelligent Log Grouping ─── */
  const groupedLogs = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    const groups = [];
    let currentGroup = null;

    filteredLogs.forEach((log, idx) => {
      if (
        currentGroup &&
        currentGroup.message === log.message &&
        currentGroup.level === log.level &&
        currentGroup.serviceName === log.serviceName
      ) {
        currentGroup.count++;
        currentGroup.lastTimestamp = log.timestamp;
        currentGroup.logs.push(log);
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          key: `group-${idx}`,
          message: log.message,
          level: log.level,
          serviceName: log.serviceName,
          firstTimestamp: log.timestamp,
          lastTimestamp: log.timestamp,
          count: 1,
          logs: [log],
        };
      }
    });
    if (currentGroup) groups.push(currentGroup);

    return groups;
  }, [filteredLogs]);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatTs = (ts) => {
    try { return new Date(ts).toISOString().replace('T', ' ').substring(0, 23); }
    catch { return ts; }
  };

  const formatTsShort = (ts) => {
    try { return new Date(ts).toISOString().substring(11, 19); }
    catch { return ts; }
  };

  const levelBadge = (level) => {
    const cls = level === 'ERROR'
      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
      : level === 'WARN'
        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${cls}`}>{level}</span>;
  };

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">LogFlow</h1>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <button
            onClick={() => scrollToSection('services', servicesRef)}
            className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none"
          >
            <Server className="w-4 h-4" /> <span>Services</span>
          </button>
          <button
            onClick={() => scrollToSection('monitors', monitorsRef)}
            className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none"
          >
            <ShieldAlert className="w-4 h-4" /> <span>Monitors</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 flex gap-6 overflow-hidden h-[calc(100vh-61px)]">

        {/* ─── Left Column: Accordion Sections ─── */}
        <div
          ref={leftColumnRef}
          style={{ width: '350px', minWidth: '280px', maxWidth: '50vw' }}
          className="flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2 shrink-0"
        >

          {/* 1. Chart */}
          <AccordionSection
            id="chart"
            title="Log Severity Distribution"
            icon={<BarChart2 className="w-4 h-4 mr-2 text-zinc-400" />}
            isOpen={openAccordions.chart}
            onToggle={() => toggleAccordion('chart')}
          >
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: '#27272a' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const { name, count, color } = payload[0].payload;
                      return (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 shadow-xl">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs font-semibold text-zinc-200">{name}</span>
                            <span className="text-xs font-bold text-zinc-100">{count}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AccordionSection>

          {/* 2. Active Services */}
          <AccordionSection
            id="services"
            title="Active Services"
            icon={<Server className="w-4 h-4 mr-2 text-blue-500" />}
            isOpen={openAccordions.services}
            onToggle={() => toggleAccordion('services')}
            sectionRef={servicesRef}
          >
            {uniqueServices.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-3">No services detected.</p>
            ) : (
              <div className="space-y-2">
                {uniqueServices.map(s => (
                  <div
                    key={s.name}
                    className="flex justify-between items-center p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer"
                    onClick={() => setSearchTerm(s.name)}
                  >
                    <span className="text-zinc-200 font-medium text-sm">{s.name}</span>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{s.count} logs</span>
                  </div>
                ))}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="w-full text-xs text-blue-400 hover:text-blue-300 transition-colors py-1 focus:outline-none"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </AccordionSection>

          {/* 3. Alert Monitors */}
          <AccordionSection
            id="monitors"
            title="Alert Monitors"
            icon={<ShieldAlert className="w-4 h-4 mr-2 text-red-500" />}
            isOpen={openAccordions.monitors}
            onToggle={() => toggleAccordion('monitors')}
            sectionRef={monitorsRef}
          >
            {/* Active Rules */}
            <div className="space-y-3 mb-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Rules</h3>
              {rules.length === 0 ? (
                <p className="text-zinc-500 text-xs italic">No rules configured.</p>
              ) : (
                rules.map(rule => (
                  <div key={rule.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="text-zinc-200 font-medium text-sm">{rule.ruleName}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider ${rule.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                          {rule.active ? 'ACTIVE' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        <strong className="text-zinc-300">{rule.serviceName}</strong> &middot; {rule.threshold} errors in {rule.windowMinutes}m
                      </p>
                    </div>
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-zinc-500 hover:text-red-400 transition-colors p-1 focus:outline-none">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Create Rule Form */}
            <div className="border-t border-zinc-800 pt-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">New Rule</h3>
              <form onSubmit={handleCreateRule} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input required type="text" value={newRule.ruleName} onChange={e => setNewRule({ ...newRule, ruleName: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    placeholder="Rule name" />
                  <input required type="text" value={newRule.serviceName} onChange={e => setNewRule({ ...newRule, serviceName: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    placeholder="Service name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input required type="number" min="1" value={newRule.threshold} onChange={e => setNewRule({ ...newRule, threshold: parseInt(e.target.value) })}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    placeholder="Threshold" />
                  <input required type="number" min="1" value={newRule.windowMinutes} onChange={e => setNewRule({ ...newRule, windowMinutes: parseInt(e.target.value) })}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    placeholder="Window (min)" />
                </div>
                <button type="submit" className="w-full flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors focus:outline-none">
                  <Plus className="w-3.5 h-3.5" /> <span>Add Rule</span>
                </button>
              </form>
            </div>
          </AccordionSection>

          {/* 4. Real-Time Analysis */}
          <AccordionSection
            id="alerts"
            title="Real-Time Analysis"
            icon={<AlertTriangle className="w-4 h-4 mr-2 text-red-500" />}
            isOpen={openAccordions.alerts}
            onToggle={() => toggleAccordion('alerts')}
          >
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 flex flex-col items-center">
                  <ShieldAlert className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No active alerts</p>
                </div>
              ) : (
                alerts.map((alert, i) => (
                  <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 relative shadow-sm">
                    <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${alert.level === 'CRITICAL' || alert.ruleName?.includes('Error') ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                    <div className="ml-2">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-zinc-200">{alert.ruleName}</h3>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{alert.serviceName}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-3">{alert.message}</p>
                      {alert.aiHypothesis && (
                        <div className="bg-blue-900/10 border border-blue-900/50 rounded-md p-3">
                          <div className="flex items-center space-x-1.5 mb-1.5">
                            <Cpu className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-semibold text-blue-400">AI Root Cause Analysis</span>
                          </div>
                          <p className="text-xs text-blue-100/80 leading-relaxed">{alert.aiHypothesis}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </AccordionSection>

        </div>

        {/* ─── Right Column: Log Explorer ─── */}
        <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 shrink-0">
            <div className="flex items-center space-x-3 w-1/2">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search logs by message, trace_id, or service..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-md pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="p-2 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors focus:outline-none">
                <Filter className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-zinc-500">
                {groupedLogs.length} groups &middot; {filteredLogs.length} events
              </span>
              <button onClick={fetchLogs} className="text-xs bg-zinc-100 text-zinc-900 hover:bg-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors focus:outline-none">
                Refresh Stream
              </button>
            </div>
          </div>

          {/* Log Table with Grouping */}
          <div className="flex-1 overflow-auto custom-scrollbar relative min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-zinc-800 w-44">Timestamp</th>
                  <th className="px-4 py-3 font-medium border-b border-zinc-800 w-24">Level</th>
                  <th className="px-4 py-3 font-medium border-b border-zinc-800 w-44">Service</th>
                  <th className="px-4 py-3 font-medium border-b border-zinc-800">Message</th>
                </tr>
              </thead>
              <tbody className="text-sm font-mono divide-y divide-zinc-800/50">
                {groupedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-zinc-500 font-sans">
                      No logs match your query.
                    </td>
                  </tr>
                ) : (
                  groupedLogs.map((group) => {
                    const isExpanded = expandedGroups.has(group.key);
                    const isSingle = group.count === 1;

                    if (isSingle) {
                      const log = group.logs[0];
                      return (
                        <tr key={group.key} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">{formatTs(log.timestamp)}</td>
                          <td className="px-4 py-2.5">{levelBadge(log.level)}</td>
                          <td className="px-4 py-2.5 text-zinc-400 text-xs">{log.serviceName}</td>
                          <td className="px-4 py-2.5 text-zinc-300">{log.message}</td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {/* Summary Row */}
                        <tr
                          key={group.key}
                          onClick={() => toggleGroup(group.key)}
                          className="hover:bg-zinc-800/30 transition-colors cursor-pointer bg-zinc-900/30"
                        >
                          <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                            <span className="flex items-center space-x-1">
                              {isExpanded
                                ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                                : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                              }
                              <span>{formatTsShort(group.firstTimestamp)} &ndash; {formatTsShort(group.lastTimestamp)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{levelBadge(group.level)}</td>
                          <td className="px-4 py-2.5 text-zinc-400 text-xs">{group.serviceName}</td>
                          <td className="px-4 py-2.5 text-zinc-300">
                            {group.message}
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25">
                              {group.count}x
                            </span>
                          </td>
                        </tr>
                        {/* Expanded Individual Rows */}
                        {isExpanded && group.logs.map((log, idx) => (
                          <tr key={`${group.key}-${idx}`} className="bg-zinc-950/40">
                            <td className="px-4 py-1.5 text-zinc-600 text-xs whitespace-nowrap pl-9">{formatTs(log.timestamp)}</td>
                            <td className="px-4 py-1.5">{levelBadge(log.level)}</td>
                            <td className="px-4 py-1.5 text-zinc-500 text-xs">{log.serviceName}</td>
                            <td className="px-4 py-1.5 text-zinc-500 text-xs">{log.message}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Global Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3f3f46;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #52525b;
        }
      `}} />
    </div>
  );
}

export default App;
