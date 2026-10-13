'use client';

import { toast } from 'sonner';
import { api } from '../StoreProvider';
import type { User } from '../../lib/types';
import { UserForm } from './AdminForms';
import { StatusBadge } from './shared';

export default function UsersView({ users, onSaved }: { users: User[]; onSaved: () => void }) {
  return <><div className="panel"><h3>Equipo autorizado</h3>{users.map(user => <div className="user-row" key={user.id}><span><strong>{user.name}</strong><small>{user.username} · {user.role === 'admin' ? 'Administrador' : 'Asesor'}</small></span><StatusBadge status={user.active ? 'Activo' : 'Inactivo'} />{user.role !== 'admin' && <button className="button outline compact" onClick={async () => { try { await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ active: user.active ? 0 : 1 }) }); onSaved(); } catch (cause) { toast.error((cause as Error).message); } }}>{user.active ? 'Desactivar' : 'Activar'}</button>}</div>)}</div><UserForm onSaved={onSaved} /></>;
}
