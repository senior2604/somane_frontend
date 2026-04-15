// somane_frontend/src/pages/SomaneAI/ImprovedSomaneAIChat.jsx
/**
 * Composant de chat amélioré pour SomaneAI
 * Utilise le backend intelligent avec accès complet aux données ERP
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiSend, FiZap, FiMenu, FiPlus, FiTrash2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { somaneAIService } from './improvedApiService';

const ImprovedSomaneAIChat = () => {
  // États
  const [conversations, setConversations] = useState([
    { id: 1, title: 'Nouvelle conversation', messages: [] }
  ]);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );
  const chatHistory = useMemo(() => activeConversation?.messages || [], [activeConversation]);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length, loading]);

  // Focus sur l'input
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  // Créer une nouvelle conversation
  const createNewConversation = () => {
    const newId = Math.max(...conversations.map(c => c.id)) + 1;
    const newConversations = [
      ...conversations,
      { id: newId, title: 'Nouvelle conversation', messages: [] }
    ];
    setConversations(newConversations);
    setActiveConversationId(newId);
  };

  // Supprimer une conversation
  const deleteConversation = (id) => {
    if (conversations.length === 1) return;
    const filtered = conversations.filter(c => c.id !== id);
    setConversations(filtered);
    if (activeConversationId === id) {
      setActiveConversationId(filtered[0].id);
    }
  };

  // Mettre à jour le titre de la conversation
  const updateConversationTitle = (id, newMessages) => {
    const firstUserMessage = newMessages.find(m => m.role === 'user');
    if (firstUserMessage && conversations.find(c => c.id === id)?.title === 'Nouvelle conversation') {
      setConversations(conversations.map(c =>
        c.id === id ? { ...c, title: firstUserMessage.content.substring(0, 30) + '...' } : c
      ));
    }
  };

  // Envoyer un message
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
    setError(null);

    try {
      // Appeler le backend intelligent
      const response = await somaneAIService.sendMessage(message);

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.ai_response || response.response || 'Désolé, je n\'ai pas pu générer une réponse.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const newMessages = [...updatedMessages, aiMessage];
      setConversations(conversations.map(c =>
        c.id === activeConversationId ? { ...c, messages: newMessages } : c
      ));

    } catch (err) {
      setError(err.message || 'Erreur réseau');
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '❌ Désolé, une erreur est survenue. Veuillez vérifier votre connexion et réessayer.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const newMessages = [...updatedMessages, errorMessage];
      setConversations(conversations.map(c =>
        c.id === activeConversationId ? { ...c, messages: newMessages } : c
      ));
    } finally {
      setLoading(false);
    }
  };

  // Gestion de la touche Entrée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading && message.trim()) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm overflow-hidden`}>
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
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                SomaneAI
              </h1>
            </div>
          </div>
          {error && (
            <div className="text-sm text-red-500 flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.length === 0 ? (
            // Écran de bienvenue
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FiZap size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-gray-900">Bienvenue sur SomaneAI</h2>
                <p className="text-gray-600 mb-8">
                  Votre assistant intelligent pour analyser et optimiser votre entreprise.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: '📊', title: 'Ventes', desc: 'Analyse tes ventes' },
                    { icon: '📦', title: 'Stock', desc: 'État du stock' },
                    { icon: '💰', title: 'Finances', desc: 'Rapport financier' },
                    { icon: '🤔', title: 'Conseil', desc: 'Optimisation' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <p className="font-medium text-sm text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <p className="text-gray-600 text-sm">
                  💡 Posez-moi une question sur vos ventes, stocks, finances, ou autres données d'entreprise!
                </p>
              </div>
            </div>
          ) : (
            // Messages du chat
            chatHistory.map((msg, idx) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-md px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <div className="text-sm">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-purple-100' : 'text-gray-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg rounded-bl-none">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez une question... (Shift+Enter pour nouvelle ligne)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows="3"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className={`px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium ${
                loading || !message.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-300/30'
              }`}
            >
              <FiSend size={18} />
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedSomaneAIChat;
