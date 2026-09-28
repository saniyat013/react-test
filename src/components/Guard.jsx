import { Component } from 'react';

// Keeps one broken panel from blanking the whole screen, and shows why it broke.
export default class Guard extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(`[${this.props.name}] crashed:`, error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="panel panel-danger panel-crash" data-panel={this.props.name}>
        <div className="panel-heading">
          <h3 className="panel-title">
            <span className="glyphicon glyphicon-alert" /> {this.props.name} crashed
          </h3>
        </div>
        <div className="panel-body">
          <code>{String(error.message || error)}</code>
        </div>
      </div>
    );
  }
}
