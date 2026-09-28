import { useEffect, useRef, useState } from 'react';
import $ from '../legacy/jquery-global.js';
import Panel from './Panel.jsx';
import { fetchAnnouncement } from '../lib/api.js';

// Carried over from the old admin theme, which was written as XHTML.
// Bootstrap builds the tooltip with $(template), so jQuery's HTML parser decides
// what the self-closing <div/> tags turn into.
const TOOLTIP_TEMPLATE = '<div class="tooltip ops-tooltip" role="tooltip"><div class="tooltip-arrow"/><div class="tooltip-inner"/></div>';

// Confirm-in-popover: Bootstrap renders this HTML; the buttons are wired with a
// delegated jQuery handler below.
const ACK_CONTENT =
  '<p class="small">Mark this announcement as read for everyone on your team?</p>' +
  '<div class="btn-group btn-group-xs">' +
  '<button type="button" class="btn btn-success" data-action="ack">Yes, acknowledge</button>' +
  '<button type="button" class="btn btn-default" data-action="cancel">Cancel</button>' +
  '</div>';

// Bootstrap 3 jQuery plugins, embedded in a React component the "legacy" way.
// Every call below ($.fn.tooltip / popover / button / modal) is provided by
// bootstrap@3.4.0 and would throw without jquery@3.4.1 on window.
export default function LegacyWidgets() {
  const rootRef = useRef(null);
  const bannerRef = useRef(null);
  const saveBtnRef = useRef(null);
  const ackBtnRef = useRef(null);
  const [title, setTitle] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const $root = $(rootRef.current);
    const $ack = $(ackBtnRef.current);
    $root.find('[data-toggle="tooltip"]').tooltip({ container: 'body', template: TOOLTIP_TEMPLATE });
    $root.find('[data-toggle="popover"]').popover({ container: 'body', html: true, trigger: 'focus' });
    $ack.popover({ container: 'body', html: true, trigger: 'click', placement: 'bottom', title: 'Acknowledge', content: ACK_CONTENT });

    $(document).on('click.ops-ack', '.popover [data-action]', (e) => {
      if ($(e.currentTarget).data('action') === 'ack') setAcknowledged(true);
      $ack.popover('hide');
    });

    // Server-provided HTML injected with jQuery .html(): the CVE-2020-11022 / 11023 sink.
    fetchAnnouncement().then((a) => {
      setTitle(a.title);
      $(bannerRef.current).html(a.html);
    });

    return () => {
      $(document).off('click.ops-ack');
      $root.find('[data-toggle="tooltip"]').tooltip('destroy');
      $root.find('[data-toggle="popover"]').popover('destroy');
      $ack.popover('destroy');
    };
  }, []);

  const simulateSave = () => {
    // Uses data-loading-text: the Bootstrap 3 button plugin path in CVE-2024-6485.
    const $btn = $(saveBtnRef.current).button('loading');
    setTimeout(() => $btn.button('reset'), 1500);
  };

  return (
    <Panel title="Legacy widgets (jQuery + Bootstrap 3)" packages={['jquery', 'bootstrap', 'axios']}>
      <div ref={rootRef}>
        <div className={`alert small ${acknowledged ? 'alert-success' : 'alert-info'}`}>
          {title && <div className="announce-title">{title}</div>}
          <div ref={bannerRef}>Loading announcement…</div>
          {acknowledged && (
            <div className="ack-state" data-testid="ack-state">
              <span className="glyphicon glyphicon-ok" /> Acknowledged
            </div>
          )}
        </div>

        <div className="btn-toolbar">
          <button type="button" className="btn btn-default btn-sm" data-toggle="tooltip" data-placement="top" title="Rendered by $.fn.tooltip" data-testid="tooltip-btn">
            <span className="glyphicon glyphicon-info-sign" /> Tooltip
          </button>
          <button
            type="button"
            className="btn btn-default btn-sm"
            data-toggle="popover"
            data-placement="top"
            title="Popover"
            data-content="Bootstrap popover with <b>html: true</b>"
            data-testid="popover-btn"
          >
            <span className="glyphicon glyphicon-comment" /> Popover
          </button>
          <button ref={ackBtnRef} type="button" className="btn btn-success btn-sm" disabled={acknowledged} data-testid="ack-btn">
            <span className="glyphicon glyphicon-check" /> Acknowledge…
          </button>
          <button type="button" className="btn btn-warning btn-sm" data-toggle="modal" data-target="#legacyModal" data-testid="modal-btn">
            <span className="glyphicon glyphicon-new-window" /> Modal
          </button>
          <button ref={saveBtnRef} type="button" className="btn btn-primary btn-sm" data-loading-text="Saving…" onClick={simulateSave} data-testid="save-btn">
            Save settings
          </button>
        </div>

        <div className="modal fade" id="legacyModal" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-sm" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
                <h4 className="modal-title">Bootstrap 3 modal</h4>
              </div>
              <div className="modal-body">Opened through Bootstrap's data-API, handled entirely by jQuery.</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-default btn-sm" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
