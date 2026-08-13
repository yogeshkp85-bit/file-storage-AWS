'use client'

import { useMemo, useRef, useState, useEffect, type DragEvent, type ChangeEvent } from 'react'
import {
  Activity,
  Archive,
  ArrowDownToLine,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Database,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Files,
  FolderOpen,
  HardDrive,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

import AuthModal from '@/components/auth-modal'

export type BackupFile = {
  id: string
  name: string
  type: 'document' | 'image' | 'spreadsheet' | 'archive'
  size: string
  size_bytes?: number
  date: string
  status: 'Completed' | 'In progress' | 'Failed'
}

const initialFiles: BackupFile[] = []

const fileIcon = { document: FileText, image: FileImage, spreadsheet: FileSpreadsheet, archive: FileArchive }

function getAuthHeaders(token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function fetchFiles(token?: string): Promise<BackupFile[]> {
  const res = await fetch('/api/files', { headers: getAuthHeaders(token) })
  if (!res.ok) throw new Error('Failed to fetch files')
  const data = await res.json()
  return data.map((f: any) => ({
    id: f.file_id,
    name: f.name,
    type: f.type,
    size: f.size,
    size_bytes: f.size_bytes,
    date: new Date(f.upload_date).toLocaleDateString() + ', ' + new Date(f.upload_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    status: f.status
  }))
}

async function uploadFile(file: File, token?: string): Promise<BackupFile> {
  const file_id = crypto.randomUUID()
  
  // 1. Get presigned URL
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size,
      file_id
    })
  })
  
  if (!res.ok) throw new Error('Failed to initialize upload')
  const { uploadUrl, file: newFile } = await res.json()
  
  // 2. Upload file to S3
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  })
  
  if (!uploadRes.ok) throw new Error('Failed to upload file to S3')
  
  return newFile
}

async function downloadFile(file: BackupFile, token?: string) {
  const res = await fetch(`/api/files/${file.id}`, { headers: getAuthHeaders(token) })
  if (!res.ok) throw new Error('Failed to get download URL')
  const { downloadUrl } = await res.json()
  
  // Trigger download
  window.open(downloadUrl, '_blank')
  return file
}

async function deleteFile(file: BackupFile, token?: string) {
  const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE', headers: getAuthHeaders(token) })
  if (!res.ok) throw new Error('Failed to delete file')
  return file
}

function Logo() {
  return <div className="flex items-center gap-2.5"><div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Cloud className="size-4" /></div><span className="font-semibold tracking-tight text-sidebar-foreground">CloudVault</span></div>
}

function Sidebar({ view, setView, user, onLogout }: { view: 'backups' | 'admin'; setView: (view: 'backups' | 'admin') => void; user: any; onLogout: () => void }) {
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'US';
  return <aside className="hidden w-[248px] shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
    <Logo />
    <div className="mt-10 flex flex-1 flex-col gap-7">
      <div><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">Workspace</p><nav className="flex flex-col gap-1">
        <button onClick={() => setView('backups')} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${view === 'backups' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}><LayoutDashboard className="size-4" />My Backups</button>
        <button onClick={() => setView('admin')} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${view === 'admin' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}><BarChart3 className="size-4" />Admin Panel</button>
      </nav></div>
      <div><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">Manage</p><nav className="flex flex-col gap-1"><button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"><Settings className="size-4" />Settings</button><button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"><LifeBuoy className="size-4" />Help center</button></nav></div>
    </div>
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3.5"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-sidebar-foreground/70">Storage used</span><HardDrive className="size-3.5 text-sidebar-foreground/50" /></div><div className="mb-2 flex items-end justify-between"><span className="text-sm font-medium">3.42 GB</span><span className="text-[11px] text-sidebar-foreground/50">of 10 GB</span></div><Progress value={34} className="h-1.5 bg-sidebar-foreground/10" /><p className="mt-2 text-[10px] text-sidebar-foreground/45">68% remaining</p></div>
    <div className="mt-5 flex items-center gap-2.5 border-t border-sidebar-border pt-4"><div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">{initials}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{user?.email || 'Authenticated User'}</p><p className="truncate text-[10px] text-sidebar-foreground/50">{user?.userId ? `ID: ${user.userId.slice(0, 8)}...` : 'Active'}</p></div><button aria-label="Sign out" onClick={onLogout} className="text-sidebar-foreground/45 hover:text-sidebar-foreground"><LogOut className="size-3.5" /></button></div>
  </aside>
}

function Header({ view, user, onLogout }: { view: 'backups' | 'admin'; user: any; onLogout: () => void }) {
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'US';
  return <header className="flex h-[72px] items-center justify-between border-b border-border bg-card px-5 md:px-8"><div className="flex items-center gap-3 lg:hidden"><Logo /></div><div className="hidden lg:block"><p className="text-xs text-muted-foreground">Workspace / <span className="text-foreground">{view === 'backups' ? 'My Backups' : 'Admin Panel'}</span></p></div><div className="flex items-center gap-3"><button aria-label="Notifications" className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Bell className="size-4" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" /></button><Separator orientation="vertical" className="h-5" /><button onClick={onLogout} className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-muted"><div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{initials}</div><span className="hidden text-xs font-medium sm:inline">{user?.email || 'User'}</span><ChevronDown className="size-3.5 text-muted-foreground" /></button></div></header>
}

function UserDashboard({ token }: { token?: string }) {
  const [files, setFiles] = useState<BackupFile[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function loadFiles() {
      try {
        const fetched = await fetchFiles(token)
        setFiles(fetched)
      } catch (error) {
        toast.error('Failed to load files. Please check your connection.')
      }
    }
    loadFiles()
  }, [token])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const filteredFiles = useMemo(() => files.filter((file) => file.name.toLowerCase().includes(query.toLowerCase())), [files, query])
  const handleUpload = async (selected: FileList | File[]) => {
    const file = selected[0]
    if (!file) return
    try {
      const newFile = await uploadFile(file, token)
      setFiles((current) => [newFile, ...current])
      toast.success(`${file.name} added to your backups`)
    } catch (error) {
      toast.error(`Failed to upload ${file.name}. Please check your connection or authorization.`)
    }
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); void handleUpload(event.dataTransfer.files) }
  const onPick = (event: ChangeEvent<HTMLInputElement>) => { void handleUpload(event.target.files ?? []) }
  const action = async (kind: 'download' | 'restore' | 'delete', file: BackupFile) => {
    try {
      if (kind === 'delete') {
        await deleteFile(file, token)
        setFiles((current) => current.filter((item) => item.id !== file.id))
        toast.success(`${file.name} deleted`)
      } else {
        await downloadFile(file, token)
        toast.success(kind === 'restore' ? `${file.name} is ready to restore` : `Downloading ${file.name}`)
      }
    } catch (error) {
      toast.error(`Failed to ${kind} ${file.name}. Please check your network or try again later.`)
    }
  }
  const totalBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0)
  const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2)
  const remainingGb = Math.max(0, 10 - Number(totalGb)).toFixed(2)
  const progressVal = (Number(totalGb) / 10) * 100

  return <div className="mx-auto max-w-[1240px] px-5 py-7 md:px-8 md:py-9"><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"><Zap className="size-3.5 fill-current" />ALL SYSTEMS OPERATIONAL</div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Your Cloud Backups</h1><p className="mt-1 text-sm text-muted-foreground">Keep your important files safe and accessible.</p></div><Button onClick={() => inputRef.current?.click()} className="w-full sm:w-auto"><Plus data-icon="inline-start" />New backup</Button><input ref={inputRef} type="file" className="hidden" onChange={onPick} /></div>
    <div className="mb-7 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Storage used</span><div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Database className="size-4" /></div></div><div className="flex items-baseline gap-1.5"><span className="text-2xl font-semibold tracking-tight">{totalGb}</span><span className="text-sm text-muted-foreground">GB / 10 GB</span></div><Progress value={progressVal} className="mt-4 h-1.5" /><p className="mt-2 text-[11px] text-muted-foreground">{remainingGb} GB available</p></div><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Total backups</span><div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Archive className="size-4" /></div></div><div className="flex items-baseline gap-1.5"><span className="text-2xl font-semibold tracking-tight">{files.length}</span><span className="text-sm text-muted-foreground">files</span></div><p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><ArrowDownToLine className="size-2.5" /></span>Active storage</p></div><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Last backup</span><div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><RefreshCw className="size-4" /></div></div><div className="flex items-baseline gap-1.5"><span className="text-2xl font-semibold tracking-tight">{files.length > 0 ? 'Active' : 'Empty'}</span></div><p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-600" />{files.length > 0 ? files[0].date : 'No backups yet'}</p></div></div>
    <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} className={`mb-8 flex min-h-[156px] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}><div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><UploadCloud className="size-5" /></div><p className="text-sm font-medium">Drop files here to back them up</p><p className="mt-1 text-xs text-muted-foreground">or <button onClick={() => inputRef.current?.click()} className="font-medium text-primary hover:underline">browse from your computer</button></p><p className="mt-3 text-[10px] text-muted-foreground">Maximum file size: 5 GB</p></div>
    <div className="flex flex-col gap-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-base font-semibold">Backup history</h2><p className="mt-0.5 text-xs text-muted-foreground">Your most recent files and folders.</p></div><div className="relative w-full sm:w-56"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search backups..." className="h-9 pl-9 text-xs" /></div></div><div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Size</th><th className="px-5 py-3 font-medium">Uploaded</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-border">{filteredFiles.map((file) => { const Icon = fileIcon[file.type]; return <tr key={file.id} className="group hover:bg-muted/25"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></div><span className="font-medium text-foreground">{file.name}</span></div></td><td className="px-5 py-4 text-muted-foreground">{file.size}</td><td className="px-5 py-4 text-muted-foreground">{file.date}</td><td className="px-5 py-4"><Badge variant={file.status === 'Completed' ? 'secondary' : 'outline'} className={file.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10' : ''}>{file.status === 'Completed' && <CheckCircle2 data-icon="inline-start" />}{file.status}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"><Button variant="ghost" size="icon" aria-label={`Download ${file.name}`} onClick={() => void action('download', file)}><ArrowDownToLine /></Button><Button variant="ghost" size="icon" aria-label={`Restore ${file.name}`} onClick={() => void action('restore', file)}><RefreshCw /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${file.name}`} onClick={() => void action('delete', file)}><Trash2 /></Button></div></td></tr> })}</tbody></table>{filteredFiles.length === 0 && <div className="flex flex-col items-center gap-2 px-6 py-12 text-center"><Files className="size-7 text-muted-foreground/50" /><p className="text-sm font-medium">No backups found</p><p className="text-xs text-muted-foreground">Try uploading a file or changing your search term.</p></div>}</div></div></div>
  </div>
}

function AdminPanel() {
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats) return <div className="mx-auto flex h-full items-center justify-center p-8"><RefreshCw className="size-6 animate-spin text-muted-foreground" /></div>;

  const getGb = (bytes: number) => ((bytes || 0) / (1024 * 1024 * 1024)).toFixed(2);
  const docGb = getGb(stats.storageByType?.document);
  const mediaGb = getGb((stats.storageByType?.image || 0));
  const archGb = getGb(stats.storageByType?.archive);
  
  // Cap at 100% for the radial chart logic
  const usagePercent = Math.min(100, (stats.totalBytes / (10 * 1024 * 1024 * 1024)) * 100);

  return <div className="mx-auto max-w-[1240px] px-5 py-7 md:px-8 md:py-9"><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"><ShieldCheck className="size-3.5" />SYSTEM OVERVIEW</div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin panel</h1><p className="mt-1 text-sm text-muted-foreground">Monitor your workspace activity and storage.</p></div><Button variant="outline" onClick={fetchStats}><RefreshCw data-icon="inline-start" />Refresh data</Button></div><div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-xs text-muted-foreground">Total storage</p><p className="mt-3 text-2xl font-semibold">{stats.totalStorageGb} GB</p><p className="mt-1 text-xs text-emerald-600">+0% this month</p></div><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-xs text-muted-foreground">Active users</p><p className="mt-3 text-2xl font-semibold">{stats.activeUsers}</p><p className="mt-1 text-xs text-muted-foreground">Current system</p></div><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-xs text-muted-foreground">Total backups</p><p className="mt-3 text-2xl font-semibold">{stats.totalBackups}</p><p className="mt-1 text-xs text-emerald-600">All successful</p></div><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-xs text-muted-foreground">System uptime</p><p className="mt-3 text-2xl font-semibold">99.99%</p><p className="mt-1 flex items-center gap-1 text-xs text-emerald-600"><Activity className="size-3" />All systems normal</p></div></div><div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Storage usage</h2><p className="mt-1 text-xs text-muted-foreground">Across all workspace members.</p></div><button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="size-4" /></button></div><div className="flex items-center gap-8"><div className="relative flex size-36 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary) 0 ${usagePercent}%, var(--muted) ${usagePercent}% 100%)` }}><div className="flex size-24 flex-col items-center justify-center rounded-full bg-card"><span className="text-xl font-semibold">{usagePercent.toFixed(0)}%</span><span className="text-[10px] text-muted-foreground">used</span></div></div><div className="flex flex-col gap-3 text-xs"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" /><span className="text-muted-foreground">Documents</span><span className="font-medium">{docGb} GB</span></div><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary/60" /><span className="text-muted-foreground">Media</span><span className="font-medium">{mediaGb} GB</span></div><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-muted-foreground/30" /><span className="text-muted-foreground">Archives</span><span className="font-medium">{archGb} GB</span></div></div></div></div><div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Latest workspace events.</p></div><button className="text-xs font-medium text-primary hover:underline">View all</button></div><div className="flex flex-col gap-4">{stats.recentActivity.length > 0 ? stats.recentActivity.map((item: string, index: number) => <div key={index} className="flex gap-3"><div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground`}><Activity className="size-3.5" /></div><div><p className="text-xs leading-5">{item}</p><p className="text-[10px] text-muted-foreground">Recently</p></div></div>) : <p className="text-xs text-muted-foreground">No recent activity.</p>}</div></div></div></div>
}

export default function CloudVaultDashboard() {
  const [view, setView] = useState<'backups' | 'admin'>('backups')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>({ email: 'clouduser@aws.com', userId: 'user_123' })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const savedToken = localStorage.getItem('cv_token')
    const savedUser = localStorage.getItem('cv_user')
    if (savedToken) setToken(savedToken)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {}
    }
  }, [])

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken)
    setUser(newUser)
    setShowAuthModal(false)
    localStorage.setItem('cv_token', newToken)
    localStorage.setItem('cv_user', JSON.stringify(newUser))
  }

  const handleLogout = () => {
    setToken(null)
    setUser({ email: 'clouduser@aws.com', userId: 'user_123' })
    localStorage.removeItem('cv_token')
    localStorage.removeItem('cv_user')
    toast.info('Switched to direct cloud workspace')
  }

  if (!isMounted) return null

  return (
    <div className="flex min-h-screen bg-background">
      {showAuthModal && <AuthModal onSuccess={handleAuthSuccess} />}
      <Sidebar view={view} setView={setView} user={user} onLogout={token ? handleLogout : () => setShowAuthModal(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header view={view} user={user} onLogout={token ? handleLogout : () => setShowAuthModal(true)} />
        <main className="flex-1">
          {view === 'backups' ? <UserDashboard token={token || undefined} /> : <AdminPanel />}
        </main>
        <footer className="flex items-center justify-between border-t border-border px-5 py-4 text-[10px] text-muted-foreground md:px-8">
          <span>CloudVault © 2025</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Direct AWS S3 & DynamoDB Workspace Active
          </span>
        </footer>
      </div>
    </div>
  )
}
