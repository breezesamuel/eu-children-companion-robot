import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Devices from './pages/Devices'
import Content from './pages/Content'
import Learning from './pages/Learning'
import Security from './pages/Security'
import SystemHealth from './pages/SystemHealth'
import Analytics from './pages/Analytics'
import FunnelDashboard from './pages/FunnelDashboard'
import RevenueDashboard from './pages/RevenueDashboard'
import ContentQualityDashboard from './pages/ContentQualityDashboard'
import SupportDashboard from './pages/SupportDashboard'
import SubscriptionDashboard from './pages/SubscriptionDashboard'
import CrmDashboard from './pages/CrmDashboard'
import RmaDashboard from './pages/RmaDashboard'
import PaymentsDashboard from './pages/PaymentsDashboard'
import LoopDashboard from './pages/LoopDashboard'
import ReferralDashboard from './pages/ReferralDashboard'
import ContentOfficerDashboard from './pages/ContentOfficerDashboard'
import ComplianceDashboard from './pages/ComplianceDashboard'
import Login from './pages/Login'

const navItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/funnel', label: '漏斗分析', icon: '📈' },
  { path: '/revenue', label: '营收分析', icon: '💰' },
  { path: '/subscription', label: '订阅计费', icon: '🔁' },
  { path: '/payments', label: '支付收单', icon: '💳' },
  { path: '/rma', label: 'RMA 售后', icon: '🔧' },
  { path: '/content-quality', label: '内容质量', icon: '⭐' },
  { path: '/support', label: '客服工单', icon: '🎧' },
  { path: '/crm', label: '外联跟进', icon: '📣' },
  { path: '/referral', label: '推荐分佣', icon: '🤝' },
  { path: '/loop', label: '自主循环', icon: '🔄' },
  { path: '/analytics', label: '深度分析', icon: '📊' },
  { path: '/users', label: '用户管理', icon: '👥' },
  { path: '/devices', label: '设备管理', icon: '🤖' },
  { path: '/content', label: '内容管理', icon: '📚' },
  { path: '/learning', label: '学习管理', icon: '📝' },
  { path: '/security', label: '安全管理', icon: '🛡️' },
  { path: '/health', label: '系统健康', icon: '💚' },
  { path: '/content-officer', label: '内容官工作台', icon: '📝' },
  { path: '/compliance', label: '合规审计', icon: '🛡️' },
  { path: '/login', label: '管理员登录', icon: '🔐' },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🤖 管理中心</h2>
          <p className="sidebar-subtitle">欧洲儿童陪护机器人</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>v1.0.0</p>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/funnel" element={<FunnelDashboard />} />
          <Route path="/revenue" element={<RevenueDashboard />} />
          <Route path="/subscription" element={<SubscriptionDashboard />} />
          <Route path="/payments" element={<PaymentsDashboard />} />
          <Route path="/rma" element={<RmaDashboard />} />
          <Route path="/content-quality" element={<ContentQualityDashboard />} />
          <Route path="/support" element={<SupportDashboard />} />
          <Route path="/crm" element={<CrmDashboard />} />
          <Route path="/referral" element={<ReferralDashboard />} />
          <Route path="/content-officer" element={<ContentOfficerDashboard />} />
          <Route path="/compliance" element={<ComplianceDashboard />} />
          <Route path="/loop" element={<LoopDashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/users" element={<Users />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/content" element={<Content />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/security" element={<Security />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  )
}
