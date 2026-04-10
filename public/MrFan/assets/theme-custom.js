(function ($, Prism) {
  if (!$) {
    return;
  }

  function clearValidation($article) {
    $article.find('.border-danger').removeClass('border-danger');
  }

  function markInvalid($element) {
    $element.addClass('border-danger');
  }

  function normalizeText(value) {
    if (value == null) {
      return '';
    }

    if (typeof value !== 'string') {
      try {
        return JSON.stringify(value, null, 4);
      } catch (error) {
        return String(value);
      }
    }

    if (value.length > 20000) {
      return value.slice(0, 20000) + '\n... response truncated ...';
    }

    return value;
  }

  function stripHtml(text) {
    if (typeof text !== 'string' || !/^\s*</.test(text)) {
      return text;
    }

    var container = document.createElement('div');
    container.innerHTML = text;
    return container.textContent || container.innerText || text;
  }

  function formatResponse(payload, xhr) {
    if (payload && typeof payload === 'object') {
      return normalizeText(payload);
    }

    var responseText = xhr && typeof xhr.responseText === 'string' ? xhr.responseText : payload;
    responseText = stripHtml(responseText);

    try {
      return JSON.stringify(JSON.parse(responseText), null, 4);
    } catch (error) {
      return normalizeText(responseText);
    }
  }

  function highlightResponse($article) {
    var responseElement = $article.find('.sample-request-response-json').get(0);
    if (Prism && responseElement) {
      Prism.highlightElement(responseElement);
    }
  }

  function showResponse($article, text) {
    var $response = $article.find('.sample-request-response');
    $response.stop(true, true).show().css('opacity', 1);
    $article.find('.sample-request-response-json').text(text || '');
    highlightResponse($article);
  }

  function hideResponse($article) {
    $article.find('.sample-request-response-json').text('');
    $article.find('.sample-request-response').hide();
  }

  function setLoading($article, loading) {
    $article.find('.sample-request-send').prop('disabled', loading);
  }

  function abortPendingRequest($article) {
    var xhr = $article.data('dkplusSampleXhr');
    if (xhr && xhr.readyState !== 4) {
      try {
        xhr.abort();
      } catch (error) {
      }
    }
    $article.removeData('dkplusSampleXhr');
  }

  function collectFamily($article, family) {
    var values = {};
    var invalid = false;

    $article.find('[data-family="' + family + '"]:visible').each(function (_, element) {
      var $element = $(element);
      var fieldName = element.dataset.name;
      var value = element.value;
      var optional = element.dataset.optional === 'true';

      if (element.type === 'checkbox') {
        if (!element.checked) {
          return;
        }
        value = 'on';
      }

      if (!value && !optional && element.type !== 'checkbox') {
        invalid = true;
        markInvalid($element);
        return;
      }

      values[fieldName] = value;
    });

    return {
      values: values,
      invalid: invalid,
    };
  }

  function buildUrl(url, params) {
    var remaining = Object.assign({}, params || {});
    var nextUrl = String(url || '');

    nextUrl = nextUrl.replace(/\{(.+?)\}/g, function (_, name) {
      if (!Object.prototype.hasOwnProperty.call(remaining, name)) {
        return '{' + name + '}';
      }

      var value = encodeURIComponent(remaining[name]);
      delete remaining[name];
      return value;
    });

    nextUrl = nextUrl.replace(/:([A-Za-z0-9_]+)/g, function (match, name) {
      if (!Object.prototype.hasOwnProperty.call(remaining, name)) {
        return match;
      }

      var value = encodeURIComponent(remaining[name]);
      delete remaining[name];
      return value;
    });

    var queryString = Object.keys(remaining)
      .filter(function (key) {
        return remaining[key] !== '' && remaining[key] != null;
      })
      .map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(remaining[key]);
      })
      .join('&');

    if (queryString) {
      nextUrl += (nextUrl.indexOf('?') === -1 ? '?' : '&') + queryString;
    }

    return nextUrl;
  }

  function toggleParamMode(selectElement) {
    var $select = $(selectElement);
    var mode = $select.val();
    var $container = $select.closest('.col-md-3');
    var $body = $container.nextAll('.sample-request-param-body').first();
    var $fields = $container.nextAll('.sample-header-content-type-fields').first();

    if (!$body.length || !$fields.length) {
      return;
    }

    if (mode === 'json') {
      $body.show();
      $fields.hide();
      return;
    }

    $body.hide();
    $fields.show();
  }

  function toggleBodyMode(selectElement) {
    var $select = $(selectElement);
    var id = $select.data('id');
    var showForm = $select.val() === 'body-form-data';
    $('#sample-request-body-json-input-' + id).toggle(!showForm);
    $('#sample-request-body-form-input-' + id).toggle(showForm);
  }

  function collectRequest($article) {
    clearValidation($article);

    var header = collectFamily($article, 'header');
    var query = collectFamily($article, 'query');
    var body = collectFamily($article, 'body');
    var $bodyJson = $article.find('[data-family="body-json"]:visible').first();
    var $paramJson = $article.find('.sample-request-param-body:visible .sample-request-body:visible').first();

    var result = {
      invalid: header.invalid || query.invalid || body.invalid,
      headers: header.values,
      query: query.values,
      data: null,
      processData: true,
    };

    if ($bodyJson.length) {
      result.headers['Content-Type'] = 'application/json';
      result.data = $bodyJson.val() || '';
      return result;
    }

    if ($paramJson.length) {
      result.headers['Content-Type'] = 'application/json';
      result.data = $paramJson.val() || '';
      return result;
    }

    if (Object.keys(body.values).length > 0) {
      var formData = new FormData();
      Object.keys(body.values).forEach(function (key) {
        formData.append(key, body.values[key]);
      });

      result.headers['Content-Type'] = 'multipart/form-data';
      result.data = formData;
      result.processData = false;
    }

    return result;
  }

  function sendSampleRequest(event) {
    event.preventDefault();

    var $button = $(this);
    var $article = $button.closest('article');
    abortPendingRequest($article);

    var request = collectRequest($article);
    if (request.invalid) {
      return;
    }

    var method = String($button.data('type') || 'get').toUpperCase();
    var ajaxOptions = {
      url: buildUrl($article.find('.sample-request-url').val(), request.query),
      type: method,
      headers: request.headers,
      timeout: 15000,
      success: function (data, textStatus, xhr) {
        showResponse($article, formatResponse(data, xhr));
      },
      error: function (xhr, textStatus, errorThrown) {
        var message = 'Error ' + (xhr && xhr.status ? xhr.status : 0) + ': ' + (errorThrown || textStatus || 'Request failed');
        var detail = formatResponse(null, xhr);
        showResponse($article, detail ? message + '\n' + detail : message);
      },
      complete: function () {
        setLoading($article, false);
        $article.removeData('dkplusSampleXhr');
      },
    };

    if (request.data !== null) {
      ajaxOptions.data = request.data;
      if (request.processData === false) {
        ajaxOptions.processData = false;
      }
      if (request.headers['Content-Type'] === 'multipart/form-data' && (method === 'GET' || method === 'DELETE')) {
        delete ajaxOptions.headers['Content-Type'];
      }
    }

    setLoading($article, true);
    showResponse($article, 'Loading...');
    $article.data('dkplusSampleXhr', $.ajax(ajaxOptions));
  }

  function resetSelect($select) {
    var selectedIndex = $select.prop('selectedIndex');
    if (selectedIndex === -1) {
      $select.prop('selectedIndex', 0);
    }
    $select.trigger('change');
  }

  function clearSampleRequest(event) {
    event.preventDefault();

    var $button = $(this);
    var $article = $button.closest('article');

    if ($button.closest('.sample-request-response').length) {
      hideResponse($article);
      return;
    }

    abortPendingRequest($article);
    setLoading($article, false);
    clearValidation($article);
    hideResponse($article);

    $article.find('.sample-request-input, .sample-request-param, .sample-request-url').each(function (_, element) {
      if (element.type === 'checkbox') {
        element.checked = false;
        return;
      }

      if (Object.prototype.hasOwnProperty.call(element, 'defaultValue')) {
        element.value = element.defaultValue || '';
        return;
      }

      element.value = '';
    });

    $article.find('textarea.sample-request-body, [data-family="body-json"]').each(function (_, element) {
      element.value = element.defaultValue || '';
    });

    $article.find('.sample-header-content-type-switch, .sample-request-content-type-switch').each(function () {
      resetSelect($(this));
    });
  }

  function bindSampleRequestEnhancements() {
    $('.sample-request-send').off('click');
    $('.sample-request-clear').off('click');
    $('.sample-header-content-type-switch').off('change');
    $('.sample-request-content-type-switch').off('change');

    $(document)
      .off('click.dkplus', '.sample-request-send')
      .on('click.dkplus', '.sample-request-send', sendSampleRequest)
      .off('click.dkplus', '.sample-request-clear')
      .on('click.dkplus', '.sample-request-clear', clearSampleRequest)
      .off('change.dkplus', '.sample-header-content-type-switch')
      .on('change.dkplus', '.sample-header-content-type-switch', function () {
        toggleParamMode(this);
      })
      .off('change.dkplus', '.sample-request-content-type-switch')
      .on('change.dkplus', '.sample-request-content-type-switch', function () {
        toggleBodyMode(this);
      });

    $('.sample-header-content-type-switch').each(function () {
      toggleParamMode(this);
    });

    $('.sample-request-content-type-switch').each(function () {
      toggleBodyMode(this);
    });
  }

  $(bindSampleRequestEnhancements);
})(window.jQuery, window.Prism);