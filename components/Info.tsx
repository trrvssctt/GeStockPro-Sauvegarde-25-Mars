import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Info as InfoIcon, AlertTriangle, Zap, Tag, Wrench, CheckCheck, RefreshCw, Loader2 } from 'lucide-react';
import { User } from '../types';
import { apiClient } from '../services/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'INFO' | 'WARNING' | 'UPDATE' | 'PROMO' | 'MAINTENANCE';
  targetPlan: string | null;
  isPinned: boolean;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface InfoProps {
  user: User;
}

const READ_KEY = 'gsp_read_announcements';

const getReadIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]'); } catch { return []; }
};
const markRead = (id: string) => {
  const ids = getReadIds();
  if (!ids.includes(id)) localStorage.setItem(READ_KEY, JSON.stringify([...ids, id]));
};
const markAllRead = (ids: string[]) => {
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
};

const TYPE_CONFIG = {
  INFO:        { icon: InfoIcon,     color: 'bg-blue-50 border-blue-200 text-blue-700',   badge: 'bg-blue-100 text-blue-700',   label: 'Information' },
  WARNING:     { icon: AlertTriangle, color: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'bg-amber-100 text-amber-700', label: 'Avertissement' },
  UPDATE:      { icon: Zap,          color: 'bg-indigo-50 border-indigo-200 text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', label: 'Mise à jour' },
  PROMO:       { icon: Tag,          color: 'bg-green-50 border-green-200 text-green-700',  badge: 'bg-green-100 text-green-700',  label: 'Offre' },
  MAINTENANCE: { icon: Wrench,       color: 'bg-slate-50 border-slate-200 text-slate-700',  badge: 'bg-slate-100 text-slate-600',  label: 'Maintenance' }
};

export const getUnreadCount = (announcements: Announcement[]): number => {
  const readIds = getReadIds();
  return announcements.filter(a => !readIds.includes(a.id)).length;
};

const Info: React.FC<InfoProps> = ({ user }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>(getReadIds());

  const planId = (user as any).planId || 'BASIC';

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/announcements?planId=${planId}`);
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleMarkRead = (id: string) => {
    markRead(id);
    setReadIds(getReadIds());
  };

  const handleMarkAllRead = () => {
    markAllRead(announcements.map(a => a.id));
    setReadIds(getReadIds());
  };

  const unreadCount = announcements.filter(a => !readIds.includes(a.id)).length;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Bell size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 uppercase tracking-widest">Notifications</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-700 transition-all"
            >
              <CheckCheck size={13} /> Tout marquer lu
            </button>
          )}
          <button
            onClick={fetchAnnouncements}
            className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="p-5 bg-slate-100 rounded-3xl">
            <Bell size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Aucune notification</p>
          <p className="text-[10px] text-slate-400">Vous serez informé ici des mises à jour importantes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(item => {
            const isRead = readIds.includes(item.id);
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.INFO;
            const Icon = cfg.icon;

            return (
              <div
                key={item.id}
                onClick={() => !isRead && handleMarkRead(item.id)}
                className={`relative p-5 rounded-3xl border transition-all cursor-pointer ${cfg.color} ${
                  isRead ? 'opacity-60' : 'shadow-sm hover:shadow-md'
                } ${item.isPinned ? 'ring-2 ring-offset-1 ring-indigo-300' : ''}`}
              >
                {/* Unread dot */}
                {!isRead && (
                  <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                )}

                {item.isPinned && (
                  <span className="absolute top-4 right-8 text-[9px] font-black uppercase tracking-widest text-indigo-500">Épinglé</span>
                )}

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex-shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {item.targetPlan && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/60 text-slate-600">
                          Plan {item.targetPlan}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.body}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold">
                      {formatDate(item.createdAt)} · par {item.createdBy}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Info;
