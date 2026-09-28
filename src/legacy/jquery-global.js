// Bootstrap 3's JavaScript plugins look up a *global* `jQuery` at load time.
// This module must be imported before 'bootstrap/dist/js/bootstrap.js'.
//   bootstrap@3.4.0  --requires-->  jquery@3.4.1   (both vulnerable)
import $ from 'jquery';

window.$ = window.jQuery = $;

export default $;
