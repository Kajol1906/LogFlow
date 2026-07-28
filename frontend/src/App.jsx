import { useEffect, useState, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import { Activity, AlertTriangle, Cpu, TerminalSquare, Search, Filter, Server, ShieldAlert, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function App() {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  useEffect(() => {
    fetchLogs();

    const socketUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/alerts';
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

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">LogFlow</h1>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <span className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"><Server className="w-4 h-4"/> <span>Services</span></span>
          <span className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"><ShieldAlert className="w-4 h-4"/> <span>Monitors</span></span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 overflow-hidden">
        
        {/* Left Column: Analytics & Alerts */}
        <div className="xl:col-span-1 flex flex-col space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Chart Widget */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center mb-4 uppercase tracking-wider">
              <BarChart2 className="w-4 h-4 mr-2 text-zinc-400"/> Log Severity Distribution
            </h2>
            <div className="h-48 w-full">
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
          </div>

          {/* AI Alerts Widget */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm flex-1 flex flex-col">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center mb-4 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500"/> Real-Time Analysis
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4">
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
          </div>
        </div>

        {/* Right Column: Log Explorer */}
        <div className="xl:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center space-x-3 w-1/2">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search logs by message, trace_id, or service..." 
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-md pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="p-2 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-zinc-500">{filteredLogs.length} events found</span>
              <button onClick={fetchLogs} className="text-xs bg-zinc-100 text-zinc-900 hover:bg-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors">
                Refresh Stream
              </button>
            </div>
          </div>

          {/* Log Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
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
        </div>
      </div>
      
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
