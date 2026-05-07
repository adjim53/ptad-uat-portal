import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  UserPlus, 
  Activity, 
  Calculator, 
  BarChart, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  FileText,
  FileDown,
  Printer,
  Loader2,
  Cloud,
  Download,
  FlaskConical,
  LayoutDashboard,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ArrowLeft,
  PieChart,
  Clock,
  Shield,
  Mail,
  X,
  Eye
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// ============================================
// FIREBASE CONFIGURATION - REPLACE THESE VALUES
// ============================================
// Step 1: Go to https://console.firebase.google.com
// Step 2: Create Project → "PTAD-UAT-System"
// Step 3: Project Settings → General → Your Apps → Web App
// Step 4: Copy the firebaseConfig object and paste it below
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyA...",
  authDomain: "ptad-uat-system.firebaseapp.com",
  projectId: "ptad-uat-system",
  storageBucket: "ptad-uat-system.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
// Admin emails - Add your email here to access the Dashboard
const ADMIN_EMAILS = [
  "aismaila@ptad.gov.ng",      // Replace with your official email
  "conyeacho@ptad.gov.ng"  // Add more admin emails as needed
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ptad-uat-system';

// ============================================
// COMPONENT: Admin Dashboard
// ============================================
const AdminDashboard = ({ onBack, user }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [stats, setStats] = useState({
    totalTests: 0,
    passRate: 0,
    failRate: 0,
    pendingRate: 0,
    avgEaseOfUse: 0,
    avgSpeed: 0,
    avgDesign: 0,
    avgAccuracy: 0,
    criticalBlockers: 0
  });

  useEffect(() => {
    loadAllSubmissions();
  }, []);

  const loadAllSubmissions = async () => {
    setLoading(true);
    try {
      const draftsRef = collection(db, 'artifacts', appId, 'public', 'data', 'uat_drafts');
      const q = query(draftsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      const allData = [];
      snapshot.forEach((doc) => {
        allData.push({ id: doc.id, ...doc.data() });
      });

      setSubmissions(allData);
      calculateStats(allData);
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (data.length === 0) return;

    let totalTests = 0;
    let passes = 0;
    let fails = 0;
    let pending = 0;
    let totalEase = 0, totalSpeed = 0, totalDesign = 0, totalAccuracy = 0;
    let assessCount = 0;
    let blockers = 0;

    data.forEach(sub => {
      if (sub.testResults) {
        Object.values(sub.testResults).forEach(result => {
          totalTests++;
          if (result.status === 'pass') passes++;
          else if (result.status === 'fail') fails++;
          else pending++;
        });
      }

      if (sub.assessment) {
        totalEase += sub.assessment.easeOfUse || 0;
        totalSpeed += sub.assessment.speed || 0;
        totalDesign += sub.assessment.design || 0;
        totalAccuracy += sub.assessment.accuracy || 0;
        assessCount++;
      }

      if (sub.finalComments?.dealBreakers?.trim()) blockers++;
    });

    setStats({
      totalTests,
      passRate: totalTests ? Math.round((passes / totalTests) * 100) : 0,
      failRate: totalTests ? Math.round((fails / totalTests) * 100) : 0,
      pendingRate: totalTests ? Math.round((pending / totalTests) * 100) : 0,
      avgEaseOfUse: assessCount ? (totalEase / assessCount).toFixed(1) : 0,
      avgSpeed: assessCount ? (totalSpeed / assessCount).toFixed(1) : 0,
      avgDesign: assessCount ? (totalDesign / assessCount).toFixed(1) : 0,
      avgAccuracy: assessCount ? (totalAccuracy / assessCount).toFixed(1) : 0,
      criticalBlockers: blockers
    });
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.testerInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.testerInfo?.department?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'withBlockers') return matchesSearch && sub.finalComments?.dealBreakers?.trim();
    if (filterStatus === 'noBlockers') return matchesSearch && !sub.finalComments?.dealBreakers?.trim();
    return matchesSearch;
  });

  const exportSummaryCSV = () => {
    let csv = "Tester,Department,Date,Tests Passed,Tests Failed,Tests Pending,Ease of Use,Speed,Design,Accuracy,Critical Blockers,Recommendations\n";

    filteredSubmissions.forEach(sub => {
      let passed = 0, failed = 0, pending = 0;
      if (sub.testResults) {
        Object.values(sub.testResults).forEach(r => {
          if (r.status === 'pass') passed++;
          else if (r.status === 'fail') failed++;
          else pending++;
        });
      }

      csv += `"${sub.testerInfo?.name || ''}","${sub.testerInfo?.department || ''}","${sub.testerInfo?.date || ''}",${passed},${failed},${pending},${sub.assessment?.easeOfUse || 0},${sub.assessment?.speed || 0},${sub.assessment?.design || 0},${sub.assessment?.accuracy || 0},"${(sub.finalComments?.dealBreakers || '').replace(/"/g, '""')}","${(sub.finalComments?.recommendations || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PTAD_UAT_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getModuleStatus = (testResults) => {
    if (!testResults) return { pass: 0, fail: 0, pending: 0 };
    let pass = 0, fail = 0, pending = 0;
    Object.values(testResults).forEach(r => {
      if (r.status === 'pass') pass++;
      else if (r.status === 'fail') fail++;
      else pending++;
    });
    return { pass, fail, pending };
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold"
        >
          <ArrowLeft className="w-5 h-5" /> Back to UAT Form
        </button>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="font-black text-slate-800">ADMIN DASHBOARD</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-black text-slate-500 uppercase">Total Submissions</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{submissions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-black text-slate-500 uppercase">Pass Rate</span>
            </div>
            <p className="text-3xl font-black text-emerald-600">{stats.passRate}%</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span className="text-xs font-black text-slate-500 uppercase">Fail Rate</span>
            </div>
            <p className="text-3xl font-black text-rose-600">{stats.failRate}%</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-black text-slate-500 uppercase">Critical Blockers</span>
            </div>
            <p className="text-3xl font-black text-amber-600">{stats.criticalBlockers}</p>
          </div>
        </div>

        {/* UX Scores */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Average UX Scores (Across All Testers)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Ease of Use', value: stats.avgEaseOfUse, color: 'bg-blue-500' },
              { label: 'Speed', value: stats.avgSpeed, color: 'bg-emerald-500' },
              { label: 'Design', value: stats.avgDesign, color: 'bg-purple-500' },
              { label: 'Accuracy', value: stats.avgAccuracy, color: 'bg-amber-500' }
            ].map(item => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{item.label}</span>
                  <span>{item.value}/5</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${(item.value / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters & Export */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by name or department..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:border-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Submissions</option>
              <option value="withBlockers">With Critical Blockers</option>
              <option value="noBlockers">No Blockers</option>
            </select>
          </div>
          <button 
            onClick={exportSummaryCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Export Summary CSV
          </button>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-slate-500 font-medium">Loading submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No submissions found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-4">Tester</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Tests</th>
                    <th className="px-6 py-4 text-center">Pass</th>
                    <th className="px-6 py-4 text-center">Fail</th>
                    <th className="px-6 py-4 text-center">Blockers</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => {
                    const status = getModuleStatus(sub.testResults);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{sub.testerInfo?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{sub.testerInfo?.department || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{sub.testerInfo?.date || '-'}</td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-slate-700">{status.pass + status.fail + status.pending}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold">{status.pass}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${status.fail > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-400'}`}>
                            {status.fail}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {sub.finalComments?.dealBreakers?.trim() ? (
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-bold">YES</span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-xs font-bold">NO</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedSubmission.testerInfo?.name}</h2>
                <p className="text-sm text-slate-500">{selectedSubmission.testerInfo?.department} • {selectedSubmission.testerInfo?.date}</p>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Test Results */}
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Test Results</h3>
                <div className="space-y-2">
                  {selectedSubmission.testResults && Object.entries(selectedSubmission.testResults).map(([id, result]) => (
                    <div key={id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className={`px-2 py-1 rounded text-xs font-black uppercase ${
                        result.status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                        result.status === 'fail' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {result.status || 'PENDING'}
                      </span>
                      <div className="flex-1">
                        <span className="font-mono text-xs text-slate-400">{id}</span>
                        <p className="text-sm text-slate-700 mt-1">{result.feedback || 'No feedback provided'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment */}
              {selectedSubmission.assessment && (
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">UX Assessment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedSubmission.assessment).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-black text-blue-600">{value}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                  <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest mb-2">Critical Blockers</h4>
                  <p className="text-sm text-slate-700">{selectedSubmission.finalComments?.dealBreakers || 'None reported'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">Recommendations</h4>
                  <p className="text-sm text-slate-700">{selectedSubmission.finalComments?.recommendations || 'None provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
const App = () => {
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [testerInfo, setTesterInfo] = useState({
    name: '',
    department: '',
    date: new Date().toISOString().split('T')[0],
    version: '1.0.0-Phase1'
  });

  const [testResults, setTestResults] = useState({
    'REG-01': { status: null, feedback: '' },
    'REG-02': { status: null, feedback: '' },
    'REG-03': { status: null, feedback: '' },
    'LIV-01': { status: null, feedback: '' },
    'LIV-02': { status: null, feedback: '' },
    'COMP-01': { status: null, feedback: '' },
    'PAY-01': { status: null, feedback: '' },
    'AUD-01': { status: null, feedback: '' },
    'REP-01': { status: null, feedback: '' },
    'DSH-01': { status: null, feedback: '' },
  });

  const [assessment, setAssessment] = useState({
    easeOfUse: 0,
    speed: 0,
    design: 0,
    accuracy: 0
  });

  const [finalComments, setFinalComments] = useState({
    dealBreakers: '',
    recommendations: ''
  });

  // Handle Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      // Check if user email is in admin list (for custom token auth)
      if (user?.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleLoadSampleData = () => {
    setTesterInfo({
      name: 'Sample Tester (Assistant Director IT)',
      department: 'IT Directorate',
      date: new Date().toISOString().split('T')[0],
      version: '1.0.0-Phase1-PROTOTYPE'
    });

    setTestResults({
      'REG-01': { status: 'pass', feedback: 'Registration flow is smooth. Diaspora module correctly handles international phone formats.' },
      'REG-02': { status: 'pass', feedback: 'NOK linkage verified. Database consistency maintained after multiple entries.' },
      'REG-03': { status: 'pass', feedback: 'Status tracker updates instantly upon submission.' },
      'LIV-01': { status: 'pass', feedback: 'Liveness test successfully triggered via mobile component.' },
      'LIV-02': { status: 'fail', feedback: 'Report manager has 2-second lag when querying records exceeding 5,000 pensioners.' },
      'COMP-01': { status: 'pass', feedback: 'Computation logic verified against legacy spreadsheet results. Arrears calculated correctly.' },
      'PAY-01': { status: 'pass', feedback: 'Payroll file generated in standard CSV format for banking portal compatibility.' },
      'AUD-01': { status: 'pass', feedback: 'Memo transfer between departments logs correctly in audit trail.' },
      'REP-01': { status: 'pass', feedback: 'Custom filters work well. Export to PDF preserves formatting.' },
      'DSH-01': { status: 'pass', feedback: 'Real-time KPIs reflect enrollment spikes immediately.' },
    });

    setAssessment({
      easeOfUse: 4,
      speed: 4,
      design: 5,
      accuracy: 5
    });

    setFinalComments({
      dealBreakers: 'Query lag in Liveness Report Manager needs indexing optimization.',
      recommendations: 'Phase 2 should include multi-factor authentication for high-value computation approvals.'
    });

    showNotification("Professional sample data loaded for demonstration.");
  };

  const handleSaveDraft = async () => {
    if (!user) {
      showNotification("Authenticating...", "error");
      return;
    }

    if (!testerInfo.name.trim()) {
      showNotification("Please enter a Tester Name to save.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const docId = testerInfo.name.replace(/\s+/g, '_').toLowerCase();
      const draftRef = doc(db, 'artifacts', appId, 'public', 'data', 'uat_drafts', docId);

      const payload = {
        testerInfo,
        testResults,
        assessment,
        finalComments,
        updatedAt: new Date().toISOString(),
        userId: user.uid,
        submittedAt: new Date().toISOString()
      };

      await setDoc(draftRef, payload);
      setLastSaved(new Date().toLocaleTimeString());
      showNotification("Saved to PTAD Cloud successfully!");
    } catch (error) {
      console.error("Save error:", error);
      showNotification("Save failed. Check internet connection.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDraft = async () => {
    if (!testerInfo.name.trim()) {
      showNotification("Enter your name to search for saved drafts.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const docId = testerInfo.name.replace(/\s+/g, '_').toLowerCase();
      const draftRef = doc(db, 'artifacts', appId, 'public', 'data', 'uat_drafts', docId);
      const snapshot = await getDoc(draftRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setTesterInfo(data.testerInfo);
        setTestResults(data.testResults);
        setAssessment(data.assessment);
        setFinalComments(data.finalComments);
        setLastSaved(new Date(data.updatedAt).toLocaleTimeString());
        showNotification("Draft loaded successfully!");
      } else {
        showNotification(`No saved draft found for "${testerInfo.name}".`, "error");
      }
    } catch (error) {
      console.error("Load error:", error);
      showNotification("Error loading data from cloud.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const updateResult = (id, field, value) => {
    setTestResults(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handlePrint = () => {
    showNotification("Generating PDF/Print preview...", "success");
    window.focus();
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadCSV = () => {
    const docId = testerInfo.name.replace(/\s+/g, '_').toLowerCase() || 'uat_report';
    const escape = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `PTAD UAT REPORT\n`;
    csvContent += `Tester Name,${escape(testerInfo.name)}\n`;
    csvContent += `Department,${escape(testerInfo.department)}\n`;
    csvContent += `Test Date,${escape(testerInfo.date)}\n\n`;
    csvContent += `Module,ID,Action,Result,Observations\n`;

    modules.forEach(m => {
      m.cases.forEach(c => {
        const res = testResults[c.id];
        csvContent += `${escape(m.title.split(':')[0])},${escape(c.id)},${escape(c.action)},${escape(res.status?.toUpperCase() || 'PENDING')},${escape(res.feedback)}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PTAD_UAT_Report_${docId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Excel CSV exported successfully.", "success");
  };

  const modules = [
    {
      title: "A. Pensioner Module: Registration & Enrollment",
      icon: <UserPlus className="w-5 h-5" />,
      cases: [
        { id: 'REG-01', action: 'Create New Diaspora/Nigeria Pensioner Enrollment', expected: 'System captures all bio-data and saves without error.' },
        { id: 'REG-02', action: 'NOK Enrollment & Linkage', expected: 'Next of Kin data is correctly linked to the primary pensioner.' },
        { id: 'REG-03', action: 'Enrollment Status Tracker', expected: 'User can view real-time status of a pending application.' }
      ]
    },
    {
      title: "B. Verification & 'I Am Alive' (Liveness Test)",
      icon: <Activity className="w-5 h-5" />,
      cases: [
        { id: 'LIV-01', action: 'Trigger Liveness Test', expected: 'System initiates biometric or digital liveness check.' },
        { id: 'LIV-02', action: 'Liveness Report Manager', expected: 'Report correctly flags "Alive" vs. "Non-Responsive" pensioners.' }
      ]
    },
    {
      title: "C. Accounting, Computation & Payroll",
      icon: <Calculator className="w-5 h-5" />,
      cases: [
        { id: 'COMP-01', action: 'Benefits Computation Logic', expected: 'System calculates arrears and monthly pension based on input data.' },
        { id: 'PAY-01', action: 'Payroll Manager Generation', expected: 'System generates payroll file consistent with computation results.' },
        { id: 'AUD-01', action: 'Audit Trail / Memo Gen', expected: 'System logs all changes and allows intra-dept memo transfer.' }
      ]
    },
    {
      title: "D. Reporting & Dashboard",
      icon: <BarChart className="w-5 h-5" />,
      cases: [
        { id: 'REP-01', action: 'Custom Report Generation', expected: 'User can filter data and export to Excel/PDF.' },
        { id: 'DSH-01', action: 'Real-Time Dashboard', expected: 'Visualizations update immediately after data changes.' }
      ]
    }
  ];

  // If admin view is active, render dashboard
  if (showAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} user={user} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900 border-t-8 border-blue-600">
      {/* Toast Notification */}
      {message.text && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 print:hidden ${message.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
          {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
          <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <header className="bg-slate-900 text-white p-6 md:p-10 border-b-4 border-blue-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-4">
                <ClipboardCheck className="w-10 h-10 text-blue-400" />
                PTAD UAT Portal
              </h1>
              <p className="text-slate-400 font-medium tracking-wide flex items-center gap-2 uppercase text-[10px]">
                Integrated Pension Administration & Digital Services Ecosystem
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              {isAdmin && (
                <button 
                  onClick={() => setShowAdmin(true)}
                  className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 text-[11px] font-bold border border-purple-700 shadow-lg"
                >
                  <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                </button>
              )}
              <button 
                onClick={handleLoadSampleData}
                className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 text-[11px] font-bold border border-amber-700 shadow-lg"
                title="Fill form with sample data for demonstration"
              >
                <FlaskConical className="w-4 h-4" /> Load Sample
              </button>
              <button 
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 text-[11px] font-bold border border-blue-700"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              <button 
                onClick={handleDownloadCSV}
                className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 text-[11px] font-bold border border-emerald-800"
              >
                <FileDown className="w-4 h-4" /> Export CSV
              </button>
              <button 
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-[11px] font-bold border border-slate-800"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Cloud'}
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 space-y-12">
          {/* User & Session Controls */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Lead Tester Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Full Name"
                    className="flex-1 p-2.5 text-sm border-2 rounded-lg border-slate-200 focus:border-blue-500 outline-none transition-all font-semibold"
                    value={testerInfo.name}
                    onChange={(e) => setTesterInfo({...testerInfo, name: e.target.value})}
                  />
                  <button 
                    onClick={handleLoadDraft}
                    disabled={isLoading}
                    title="Load saved draft from cloud"
                    className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors print:hidden"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Directorate/Dept</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 text-sm border-2 rounded-lg border-slate-200 focus:border-blue-500 outline-none transition-all font-semibold"
                  value={testerInfo.department}
                  onChange={(e) => setTesterInfo({...testerInfo, department: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Testing Date</label>
                <input 
                  type="date" 
                  className="w-full p-2.5 text-sm border-2 rounded-lg border-slate-200 focus:border-blue-500 outline-none transition-all font-semibold"
                  value={testerInfo.date}
                  onChange={(e) => setTesterInfo({...testerInfo, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cloud Sync Status</label>
                <div className="p-2.5 bg-white border-2 border-slate-200 rounded-lg text-[11px] font-black text-slate-400 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${user ? 'bg-emerald-500 shadow-md' : 'bg-slate-300'}`}></div>
                  {user ? 'CONNECTED' : 'WAITING...'}
                </div>
              </div>
            </div>
          </section>

          {/* Module Testing Logs */}
          <div className="space-y-16">
            {modules.map((module, mIdx) => (
              <section key={mIdx} className="space-y-6">
                <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-3">
                  <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">{module.icon}</div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{module.title.split(':')[0]}</h2>
                  <span className="text-slate-400 font-medium text-xs ml-auto print:hidden italic">{module.title.split(':')[1]}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-slate-400 text-[11px] uppercase font-black tracking-widest px-4">
                        <th className="px-6 py-2 w-20 text-center">ID</th>
                        <th className="px-6 py-2">Test Script / Requirements</th>
                        <th className="px-6 py-2 w-48 text-center print:hidden">Validation</th>
                        <th className="px-6 py-2 w-28 hidden print:table-cell">Outcome</th>
                        <th className="px-6 py-2">Feedback & Error Observations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {module.cases.map((test) => (
                        <tr key={test.id} className="bg-slate-50/70 group hover:bg-slate-100/70 transition-all border border-slate-100">
                          <td className="px-6 py-6 align-top font-mono text-[11px] font-black text-slate-400 text-center">{test.id}</td>
                          <td className="px-6 py-6 align-top max-w-xs">
                            <div className="font-bold text-slate-800 text-sm leading-snug mb-2">{test.action}</div>
                            <div className="text-[11px] text-slate-500 leading-relaxed font-medium bg-white/50 p-2 rounded border border-slate-100">
                              <span className="font-bold text-blue-500 uppercase text-[9px] mr-1">Expected:</span>
                              {test.expected}
                            </div>
                          </td>
                          <td className="px-6 py-6 align-top print:hidden">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => updateResult(test.id, 'status', 'pass')}
                                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${testResults[test.id].status === 'pass' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-200' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300'}`}
                              >
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Pass</span>
                              </button>
                              <button 
                                onClick={() => updateResult(test.id, 'status', 'fail')}
                                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${testResults[test.id].status === 'fail' ? 'bg-rose-600 border-rose-600 text-white shadow-xl shadow-rose-200' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300'}`}
                              >
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Fail</span>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-6 align-top hidden print:table-cell text-center">
                             <div className={`px-2 py-1 rounded font-black uppercase text-[10px] border-2 ${testResults[test.id].status === 'pass' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : testResults[test.id].status === 'fail' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                {testResults[test.id].status || 'Pending'}
                             </div>
                          </td>
                          <td className="px-6 py-6 align-top">
                            <textarea 
                              placeholder="Describe technical behavior or UI issues..."
                              className="w-full p-4 text-[13px] border-2 border-slate-200 rounded-xl h-24 outline-none resize-none bg-white/80 transition-all print:border-none print:h-auto print:italic"
                              value={testResults[test.id].feedback}
                              onChange={(e) => updateResult(test.id, 'feedback', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>

          {/* Assessment Section */}
          <section className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <BarChart className="w-48 h-48" />
            </div>
            <div className="relative z-10 space-y-10">
              <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                <FileText className="w-8 h-8 text-blue-400" />
                <h2 className="text-2xl font-black uppercase tracking-tight">System UX Scoring (1-5)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                {[
                  { key: 'easeOfUse', label: 'Ease of Use & Intuitiveness' },
                  { key: 'speed', label: 'Processing Speed (Backend Sync)' },
                  { key: 'design', label: 'UI Clarity & Accessibility' },
                  { key: 'accuracy', label: 'Data Harmonization Accuracy' }
                ].map((item) => (
                  <div key={item.key} className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                      <div className="flex items-baseline gap-1">
                        <span className="text-blue-400 font-black text-3xl">{assessment[item.key]}</span>
                        <span className="text-slate-600 text-sm">/ 5</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setAssessment({...assessment, [item.key]: num})}
                          className={`flex-1 h-12 rounded-xl font-black text-sm transition-all ${assessment[item.key] === num ? 'bg-blue-600 text-white shadow-xl ring-2 ring-blue-400' : 'bg-slate-800 border border-slate-700 text-slate-500 hover:text-white'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="hidden print:block w-full h-2 bg-slate-800 rounded-full border border-slate-700">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(assessment[item.key]/5)*100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Recommendations Area */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
            <div className="space-y-4">
              <label className="text-sm font-black text-rose-600 flex items-center gap-3 uppercase tracking-tighter bg-rose-50 p-3 rounded-lg border border-rose-100">
                <AlertCircle className="w-5 h-5" />
                Critical Deployment Blockers
              </label>
              <textarea 
                placeholder="Identify bugs that MUST be resolved before Phase 1 deployment..."
                className="w-full p-5 text-sm border-2 border-slate-100 rounded-2xl h-44 outline-none bg-rose-50/5 print:bg-transparent print:h-auto print:border-none"
                value={finalComments.dealBreakers}
                onChange={(e) => setFinalComments({...finalComments, dealBreakers: e.target.value})}
              />
            </div>
            <div className="space-y-4">
              <label className="text-sm font-black text-blue-600 flex items-center gap-3 uppercase tracking-tighter bg-blue-50 p-3 rounded-lg border border-blue-100">
                <CheckCircle className="w-5 h-5" />
                Phase 2 Optimizations
              </label>
              <textarea 
                placeholder="Suggestions for non-critical performance optimizations or UI enhancements..."
                className="w-full p-5 text-sm border-2 border-slate-100 rounded-2xl h-44 outline-none focus:bg-white transition-all print:h-auto print:border-none"
                value={finalComments.recommendations}
                onChange={(e) => setFinalComments({...finalComments, recommendations: e.target.value})}
              />
            </div>
          </section>

          {/* Signature & Audit Footnote */}
          <footer className="pt-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-end gap-12">
            <div className="w-full md:w-auto text-left space-y-4">
              <div className="flex gap-16 items-end flex-wrap">
                <div className="space-y-2">
                  <div className="h-[2px] w-64 bg-slate-300"></div>
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Assistant Director (IT) / Project Lead</p>
                </div>
                <div className="space-y-2">
                  <div className="h-[2px] w-48 bg-slate-300"></div>
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Date / Stamp</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono select-all">Session ID: {user?.uid?.substring(0, 16) || 'PTAD-UAT-PR-01'}</p>
            </div>
            <div className="text-right space-y-2">
              <p className="text-[11px] font-black text-slate-700 uppercase">PTAD IT Directorate Document</p>
              <p className="text-[10px] text-slate-400 font-medium italic">Cycle: Phase 1 Automation & Harmonization</p>
              <p className="text-[9px] text-blue-500 font-bold hidden print:block">VERIFIED CLOUD RECORD (GOOGLE FIREBASE)</p>
            </div>
          </footer>
        </div>
      </div>

      {/* Global CSS for Print - Optimized for Chrome/PDF */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1.5cm; size: A4 portrait; }
          html, body { height: auto !important; overflow: visible !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .shadow-2xl, .shadow-xl { box-shadow: none !important; }
          .rounded-2xl, .rounded-3xl { border-radius: 4px !important; }
          .border, .border-2 { border-color: #eee !important; border-width: 1px !important; }
          textarea { border: none !important; padding: 0 !important; font-style: italic; overflow: visible !important; height: auto !important; }
          .bg-slate-900 { background-color: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact !important; }
          .bg-slate-100, .bg-slate-50 { background-color: white !important; }
          .bg-emerald-600 { background-color: #059669 !important; color: white !important; -webkit-print-color-adjust: exact !important; }
          .bg-rose-600 { background-color: #e11d48 !important; color: white !important; -webkit-print-color-adjust: exact !important; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; border-color: #10b981 !important; -webkit-print-color-adjust: exact !important; }
          .bg-rose-50 { background-color: #fff1f2 !important; border-color: #f43f5e !important; -webkit-print-color-adjust: exact !important; }
          button, .print\:hidden { display: none !important; visibility: hidden !important; }
          input { border: none !important; padding: 0 !important; font-weight: bold; background: transparent !important; }
          .print\:block { display: block !important; }
          .print\:table-cell { display: table-cell !important; }
          table { width: 100% !important; border-collapse: collapse !important; page-break-inside: auto; }
          tr { page-break-inside: avoid !important; page-break-after: auto; }
          section { page-break-inside: avoid !important; }
          header { -webkit-print-color-adjust: exact !important; border-bottom: 8px solid #3b82f6 !important; }
        }
      `}} />
    </div>
  );
};

export default App;