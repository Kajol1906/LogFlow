import { useEffect, useState, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import { Activity, AlertTriangle, Cpu, TerminalSquare, Search, Filter, Server, ShieldAlert, BarChart2, X, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

function App() {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isMonitorsOpen, setIsMonitorsOpen] = useState(false);
  
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({ ruleName: '', serviceName: '', condition: 'ERROR_COUNT', threshold: 5, windowMinutes: 5, severity: 'CRITICAL', active: true });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  useEffect(() => {
    fetchLogs();

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

  useEffect(() => {
    if (isMonitorsOpen) fetchRules();
  }, [isMonitorsOpen]);

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
      { name: 'ERROR', count: error, color: '#ef4444' }
    ];
  }, [logs]);

  const uniqueServices = useMemo(() => {
    const counts = {};
    logs.forEach(l => {
      if (l.serviceName) {
        counts[l.serviceName] = (counts[l.serviceName] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [logs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col relative">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">LogFlow</h1>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <button onClick={() => setIsServicesOpen(true)} className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors focus:outline-none">
            <Server className="w-4 h-4"/> <span>Services</span>
          </button>
          <button onClick={() => setIsMonitorsOpen(true)} className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors focus:outline-none">
            <ShieldAlert className="w-4 h-4"/> <span>Monitors</span>
          </button>
        </div>
      </header>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 p-4 overflow-hidden h-[calc(100vh-61px)]">
        <PanelGroup direction="horizontal" className="h-full w-full">
          
          {/* Left Column: Analytics & Alerts */}
          <Panel defaultSize={25} minSize={20} maxSize={50}>
            <PanelGroup direction="vertical">
              
              {/* Chart Widget */}
              <Panel defaultSize={40} minSize={20} className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center mb-4 uppercase tracking-wider shrink-0">
                  <BarChart2 className="w-4 h-4 mr-2 text-zinc-400"/> Log Severity Distribution
                </h2>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#27272a'}} contentStyle={{backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px'}} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* Vertical Horizontal Divider */}
              <PanelResizeHandle className="h-4 flex items-center justify-center cursor-row-resize group">
                 <div className="w-8 h-1 bg-zinc-800 rounded-full group-hover:bg-blue-500 transition-colors" />
              </PanelResizeHandle>

              {/* AI Alerts Widget */}
              <Panel minSize={30} className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center mb-4 uppercase tracking-wider shrink-0">
                  <AlertTriangle className="w-4 h-4 mr-2 text-red-500"/> Real-Time Analysis
                </h2>
                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 min-h-0">
                  {alerts.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 flex flex-col items-center">
                      <ShieldAlert className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">No active alerts</p>
                    </div>
                  ) : (
                    alerts.map((alert, i) => (
                      <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 relative shadow-sm">
                        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${alert.level === 'CRITICAL' || alert.ruleName.includes('Error') ? 'bg-red-500' : 'bg-amber-500'}`}></div>
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
              </Panel>
            </PanelGroup>
          </Panel>

          {/* Horizontal Divider */}
          <PanelResizeHandle className="w-4 flex items-center justify-center cursor-col-resize px-1 group">
             <div className="h-8 w-1 bg-zinc-800 rounded-full group-hover:bg-blue-500 transition-colors" />
          </PanelResizeHandle>

          {/* Right Column: Log Explorer */}
          <Panel minSize={40} className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
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
                <span className="text-xs text-zinc-500">{filteredLogs.length} events found</span>
                <button onClick={fetchLogs} className="text-xs bg-zinc-100 text-zinc-900 hover:bg-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors focus:outline-none">
                  Refresh Stream
                </button>
              </div>
            </div>

            {/* Log Table */}
            <div className="flex-1 overflow-auto custom-scrollbar relative min-h-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium border-b border-zinc-800 w-40">Timestamp</th>
                    <th className="px-4 py-3 font-medium border-b border-zinc-800 w-24">Level</th>
                    <th className="px-4 py-3 font-medium border-b border-zinc-800 w-48">Service</th>
                    <th className="px-4 py-3 font-medium border-b border-zinc-800">Message</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono divide-y divide-zinc-800/50">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-zinc-500 font-sans">
                        No logs match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                          {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 23)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                            log.level === 'ERROR' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                            log.level === 'WARN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 text-xs">
                          {log.serviceName}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-300 group-hover:text-zinc-100 transition-colors">
                          {log.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

        </PanelGroup>
      </div>

      {/* Services Modal */}
      {isServicesOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center"><Server className="w-5 h-5 mr-2 text-blue-500"/> Active Services</h2>
              <button onClick={() => setIsServicesOpen(false)} className="text-zinc-400 hover:text-zinc-200 focus:outline-none"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96 custom-scrollbar">
              {uniqueServices.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No services detected in recent logs.</p>
              ) : (
                <div className="space-y-2">
                  {uniqueServices.map(s => (
                    <div key={s.name} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => { setSearchTerm(s.name); setIsServicesOpen(false); }}>
                      <span className="text-zinc-200 font-medium">{s.name}</span>
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">{s.count} logs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monitors Modal */}
      {isMonitorsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 shrink-0">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center"><ShieldAlert className="w-5 h-5 mr-2 text-red-500"/> Alert Monitors</h2>
              <button onClick={() => setIsMonitorsOpen(false)} className="text-zinc-400 hover:text-zinc-200 focus:outline-none"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {/* Active Rules List */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Active Rules</h3>
                {rules.length === 0 ? (
                  <p className="text-zinc-500 text-sm italic">No alert rules configured.</p>
                ) : (
                  <div className="space-y-3">
                    {rules.map(rule => (
                      <div key={rule.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-zinc-200 font-medium">{rule.ruleName}</h4>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider ${rule.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                              {rule.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">Triggers if <strong className="text-zinc-300">{rule.serviceName}</strong> hits <strong className="text-zinc-300">{rule.threshold} {rule.condition}</strong> in <strong className="text-zinc-300">{rule.windowMinutes}m</strong>.</p>
                        </div>
                        <button onClick={() => handleDeleteRule(rule.id)} className="text-zinc-500 hover:text-red-400 transition-colors p-1 focus:outline-none">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-zinc-800" />

              {/* Create Rule Form */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Create New Rule</h3>
                <form onSubmit={handleCreateRule} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Rule Name</label>
                      <input required type="text" value={newRule.ruleName} onChange={e => setNewRule({...newRule, ruleName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500" placeholder="e.g. Auth Spike" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Service Name</label>
                      <input required type="text" value={newRule.serviceName} onChange={e => setNewRule({...newRule, serviceName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500" placeholder="e.g. auth-service" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Condition</label>
                      <select disabled value={newRule.condition} className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm rounded-md px-3 py-1.5 focus:outline-none opacity-80 cursor-not-allowed">
                        <option value="ERROR_COUNT">Error Count</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Threshold</label>
                      <input required type="number" min="1" value={newRule.threshold} onChange={e => setNewRule({...newRule, threshold: parseInt(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Window (Minutes)</label>
                      <input required type="number" min="1" value={newRule.windowMinutes} onChange={e => setNewRule({...newRule, windowMinutes: parseInt(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button type="submit" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors focus:outline-none">
                      <Plus className="w-4 h-4" /> <span>Add Rule</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* Global Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{__html: `
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
