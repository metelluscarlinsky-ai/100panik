// 100PANIK - Customer Auth Helper
(function() {
  'use strict';
  var TOKEN_KEY = 'panik_customer_token';
  var CUSTOMER_KEY = 'panik_customer_data';

  window.CustomerAuth = {
    save: function(token, customer) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    },
    getToken: function() {
      return localStorage.getItem(TOKEN_KEY);
    },
    getCustomer: function() {
      try {
        var raw = localStorage.getItem(CUSTOMER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    isLoggedIn: function() {
      return !!this.getToken() && !!this.getCustomer();
    },
    logout: function() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CUSTOMER_KEY);
      window.dispatchEvent(new Event('customer-logout'));
    },
    fetch: function(path, opts) {
      opts = opts || {};
      var headers = { 'Content-Type': 'application/json' };
      var t = this.getToken();
      if (t) headers.Authorization = 'Bearer ' + t;
      if (opts.headers) {
        for (var k in opts.headers) headers[k] = opts.headers[k];
      }
      var o = { method: opts.method || 'GET', headers: headers };
      if (opts.body) o.body = JSON.stringify(opts.body);
      return fetch(path, o).then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok) throw new Error(data.error || ('Erè ' + res.status));
          return data;
        });
      });
    }
  };
})();
