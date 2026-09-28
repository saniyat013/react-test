import Guard from './components/Guard.jsx';
import DeviceBadge from './components/DeviceBadge.jsx';
import UserDirectory from './components/UserDirectory.jsx';
import WorldClock from './components/WorldClock.jsx';
import MarkdownNotes from './components/MarkdownNotes.jsx';
import SecureVault from './components/SecureVault.jsx';
import NotificationTemplates from './components/NotificationTemplates.jsx';
import LegacyWidgets from './components/LegacyWidgets.jsx';
import DependencyInventory from './components/DependencyInventory.jsx';

export default function App() {
  return (
    <>
      <nav className="navbar navbar-inverse navbar-static-top">
        <div className="container-fluid">
          <div className="navbar-header">
            <span className="navbar-brand">
              <span className="glyphicon glyphicon-dashboard" /> Ops Console
            </span>
          </div>
          <Guard name="Device badge">
            <DeviceBadge />
          </Guard>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="alert alert-danger demo-warning">
          <strong>Intentionally vulnerable.</strong> This app pins outdated packages on purpose. Do not deploy it.
        </div>
        <div className="row">
          <div className="col-md-7">
            <Guard name="User directory"><UserDirectory /></Guard>
          </div>
          <div className="col-md-5">
            <Guard name="World clock"><WorldClock /></Guard>
          </div>
        </div>
        <div className="row">
          <div className="col-md-7">
            <Guard name="Markdown notes"><MarkdownNotes /></Guard>
          </div>
          <div className="col-md-5">
            <Guard name="Secrets vault"><SecureVault /></Guard>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <Guard name="Notification templates"><NotificationTemplates /></Guard>
          </div>
          <div className="col-md-6">
            <Guard name="Legacy widgets"><LegacyWidgets /></Guard>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <Guard name="Dependency inventory"><DependencyInventory /></Guard>
          </div>
        </div>
      </div>
    </>
  );
}
