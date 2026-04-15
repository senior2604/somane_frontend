import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiSend, FiZap, FiUser, FiMenu, FiPlus, FiTrash2, FiCopy, FiRefreshCw } from 'react-icons/fi';
import ChartComponent from './ChartComponent';
import { generateChartData, getAIResponse } from './aiUtils';
import { useAIData, useVentesAnalytics, useFinancesAnalytics } from './useAIData';
import { logAIInteraction } from './apiService';
import ReactMarkdown from 'react-markdown';
import ImprovedSomaneAIChat from './ImprovedSomaneAIChat';

const _SomaneAIPage = () => {
  const [conversations, setConversations] = useState([
    { id: 1, title: 'Nouvelle conversation', messages: [] }
  ]);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Charger les vraies données du backend
  const { data: realData, loading: dataLoading, refetch: refetchData } = useAIData();

  // Analyser les vraies données
  const ventesAnalytics = useVentesAnalytics(realData.ventes);
  const financesAnalytics = useFinancesAnalytics(realData.finances, realData.ventes);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );
  const chatHistory = useMemo(() => activeConversation?.messages || [], [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory.length, loading]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const createNewConversation = () => {
    const newId = Math.max(...conversations.map(c => c.id)) + 1;
    const newConversations = [
      ...conversations,
      { id: newId, title: 'Nouvelle conversation', messages: [] }
    ];
    setConversations(newConversations);
    setActiveConversationId(newId);
  };

  const deleteConversation = (id) => {
    if (conversations.length === 1) return;
    const filtered = conversations.filter(c => c.id !== id);
    setConversations(filtered);
    if (activeConversationId === id) {
      setActiveConversationId(filtered[0].id);
    }
  };

  const updateConversationTitle = (id, newMessages) => {
    const firstUserMessage = newMessages.find(m => m.role === 'user');
    if (firstUserMessage && conversations.find(c => c.id === id)?.title === 'Nouvelle conversation') {
      setConversations(conversations.map(c =>
        c.id === id ? { ...c, title: firstUserMessage.content.substring(0, 30) + '...' } : c
      ));
    }
  };

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...chatHistory, userMessage];
    updateConversationTitle(activeConversationId, updatedMessages);
    setConversations(conversations.map(c =>
      c.id === activeConversationId ? { ...c, messages: updatedMessages } : c
    ));
    setMessage('');
    setLoading(true);

    // Simule la réponse de l'IA avec délai
    setTimeout(async () => {
      // Préparer les données réelles pour l'analyse
      const combinedData = {
        ...realData,
        ventesAnalytics,
        financesAnalytics,
        ventesParCategorie: ventesAnalytics?.parCategorie || [],
        ventesParMois: ventesAnalytics?.parMois || [],
        financesParCategorie: financesAnalytics?.parCategorie || [],
      };

      const aiResponse = getAIResponse(message, combinedData);
      const shouldShowCharts = message.toLowerCase().includes('analyse') ||
        message.toLowerCase().includes('rapport') ||
        message.toLowerCase().includes('montre') ||
        message.toLowerCase().includes('vente') ||
        message.toLowerCase().includes('stock') ||
        message.toLowerCase().includes('finance') ||
        message.toLowerCase().includes('graphe') ||
        message.toLowerCase().includes('kpi');

      const charts = shouldShowCharts ? generateChartData('mixed', message, combinedData) : null;

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        charts: charts
      };

      // Logger l'interaction pour l'apprentissage de l'IA
      try {
        await logAIInteraction(message, aiResponse, combinedData);
      } catch (err) {
        console.error('Erreur logging interaction:', err);
      }

      const newMessages = [...updatedMessages, aiMessage];
      setConversations(conversations.map(c =>
        c.id === activeConversationId ? { ...c, messages: newMessages } : c
      ));

      setLoading(false);
    }, 1000 + Math.random() * 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading && message.trim()) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm`}>
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-purple-300/30 text-white py-3 px-4 rounded-xl transition-all duration-200"
          >
            <FiPlus size={18} /> Nouveau chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`p-3 rounded-xl cursor-pointer group transition-all duration-200 ${
                activeConversationId === conv.id
                  ? 'bg-gradient-to-r from-violet-100 to-purple-100 text-gray-900 border border-purple-300 shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
              onClick={() => setActiveConversationId(conv.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium truncate text-gray-900">{conv.title}</p>
                  <p className="text-xs text-gray-500">{conv.messages.length} messages</p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiTrash2 size={16} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <FiMenu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <FiZap size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">SomaneAI</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetchData}
              disabled={dataLoading}
              className={`p-2 rounded-lg transition-all ${
                dataLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed animate-spin'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-purple-600'
              }`}
              title="Rafraîchir les données"
            >
              <FiRefreshCw size={18} />
            </button>
            <span className="text-sm text-gray-500">
              {dataLoading ? 'Chargement...' : 'À jour'}
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.length === 0 ? (
            // Welcome Screen
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FiZap size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-gray-900">Bienvenue sur SomaneAI</h2>
                <p className="text-gray-600 mb-8">
                  Votre assistant IA pour l'analyse et l'optimisation de votre entreprise.
                  Posez-moi vos questions sur vos ventes, stocks, finances, et bien plus.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    '📊 Analyse mes ventes',
                    '📦 État de mon stock',
                    '💰 Rapport financier',
                    '⚡ Optimiser mes coûts',
                    '📈 KPI performance',
                    '💡 Conseils business'
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMessage(suggestion)}
                      className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-violet-50 hover:to-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl text-left text-sm transition-all duration-200 text-gray-700 hover:text-purple-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl`}>
                    {/* Avatar et header */}
                    <div className={`flex items-center gap-3 mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md'
                      }`}>
                        {msg.role === 'user' ? (
                          <FiUser size={16} />
                        ) : (
                          <FiZap size={16} />
                        )}
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{msg.role === 'user' ? 'Vous' : 'SomaneAI'}</span>
                    </div>

                    {/* Message Content */}
                    <div className={`rounded-xl p-4 backdrop-blur-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-100 to-violet-100 text-gray-900 border border-purple-200 shadow-sm'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900 border border-gray-200 shadow-sm'
                    }`}>
                      <div className="prose prose-lg max-w-none text-sm text-gray-800 prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:bg-purple-100 prose-code:text-purple-600 prose-code:px-2 prose-code:py-1 prose-code:rounded">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {msg.role === 'assistant' && (
                        <div className="flex gap-2 mt-3 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors text-gray-600"
                            title="Copier"
                          >
                            <FiCopy size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Charts */}
                    {msg.charts && msg.charts.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {msg.charts.map((chart, idx) => (
                          <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                            <ChartComponent 
                              type={chart.type}
                              data={chart.data}
                              title={chart.title}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <FiZap size={16} className="text-white" />
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 flex gap-2 shadow-sm">
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Posez votre question à SomaneAI... (Shift+Entrée pour nouvelle ligne)"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:border-transparent
                           text-gray-900 placeholder-gray-500 resize-none max-h-32 transition-all"
                  rows="2"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 flex-shrink-0
                          ${message.trim() && !loading
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-purple-300/40 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                <FiSend size={18} />
                {loading ? '...' : 'Envoyer'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              SomaneAI • Version 1.0 • Vos données sécurisées
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export the improved chat component as the page default
export default ImprovedSomaneAIChat;