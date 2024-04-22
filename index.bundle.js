(self["webpackChunkmodule_webpack_starter"] = self["webpackChunkmodule_webpack_starter"] || []).push([["index"],{

/***/ "./node_modules/@iconfu/svg-inject/dist/svg-inject.js":
/*!************************************************************!*\
  !*** ./node_modules/@iconfu/svg-inject/dist/svg-inject.js ***!
  \************************************************************/
/***/ ((module) => {

/**
 * SVGInject - Version 1.2.3
 * A tiny, intuitive, robust, caching solution for injecting SVG files inline into the DOM.
 *
 * https://github.com/iconfu/svg-inject
 *
 * Copyright (c) 2018 INCORS, the creators of iconfu.com
 * @license MIT License - https://github.com/iconfu/svg-inject/blob/master/LICENSE
 */

(function(window, document) {
  // constants for better minification
  var _CREATE_ELEMENT_ = 'createElement';
  var _GET_ELEMENTS_BY_TAG_NAME_ = 'getElementsByTagName';
  var _LENGTH_ = 'length';
  var _STYLE_ = 'style';
  var _TITLE_ = 'title';
  var _UNDEFINED_ = 'undefined';
  var _SET_ATTRIBUTE_ = 'setAttribute';
  var _GET_ATTRIBUTE_ = 'getAttribute';

  var NULL = null;

  // constants
  var __SVGINJECT = '__svgInject';
  var ID_SUFFIX = '--inject-';
  var ID_SUFFIX_REGEX = new RegExp(ID_SUFFIX + '\\d+', "g");
  var LOAD_FAIL = 'LOAD_FAIL';
  var SVG_NOT_SUPPORTED = 'SVG_NOT_SUPPORTED';
  var SVG_INVALID = 'SVG_INVALID';
  var ATTRIBUTE_EXCLUSION_NAMES = ['src', 'alt', 'onload', 'onerror'];
  var A_ELEMENT = document[_CREATE_ELEMENT_]('a');
  var IS_SVG_SUPPORTED = typeof SVGRect != _UNDEFINED_;
  var DEFAULT_OPTIONS = {
    useCache: true,
    copyAttributes: true,
    makeIdsUnique: true
  };
  // Map of IRI referenceable tag names to properties that can reference them. This is defined in
  // https://www.w3.org/TR/SVG11/linking.html#processingIRI
  var IRI_TAG_PROPERTIES_MAP = {
    clipPath: ['clip-path'],
    'color-profile': NULL,
    cursor: NULL,
    filter: NULL,
    linearGradient: ['fill', 'stroke'],
    marker: ['marker', 'marker-end', 'marker-mid', 'marker-start'],
    mask: NULL,
    pattern: ['fill', 'stroke'],
    radialGradient: ['fill', 'stroke']
  };
  var INJECTED = 1;
  var FAIL = 2;

  var uniqueIdCounter = 1;
  var xmlSerializer;
  var domParser;


  // creates an SVG document from an SVG string
  function svgStringToSvgDoc(svgStr) {
    domParser = domParser || new DOMParser();
    return domParser.parseFromString(svgStr, 'text/xml');
  }


  // searializes an SVG element to an SVG string
  function svgElemToSvgString(svgElement) {
    xmlSerializer = xmlSerializer || new XMLSerializer();
    return xmlSerializer.serializeToString(svgElement);
  }


  // Returns the absolute url for the specified url
  function getAbsoluteUrl(url) {
    A_ELEMENT.href = url;
    return A_ELEMENT.href;
  }


  // Load svg with an XHR request
  function loadSvg(url, callback, errorCallback) {
    if (url) {
      var req = new XMLHttpRequest();
      req.onreadystatechange = function() {
        if (req.readyState == 4) {
          // readyState is DONE
          var status = req.status;
          if (status == 200) {
            // request status is OK
            callback(req.responseXML, req.responseText.trim());
          } else if (status >= 400) {
            // request status is error (4xx or 5xx)
            errorCallback();
          } else if (status == 0) {
            // request status 0 can indicate a failed cross-domain call
            errorCallback();
          }
        }
      };
      req.open('GET', url, true);
      req.send();
    }
  }


  // Copy attributes from img element to svg element
  function copyAttributes(imgElem, svgElem) {
    var attribute;
    var attributeName;
    var attributeValue;
    var attributes = imgElem.attributes;
    for (var i = 0; i < attributes[_LENGTH_]; i++) {
      attribute = attributes[i];
      attributeName = attribute.name;
      // Only copy attributes not explicitly excluded from copying
      if (ATTRIBUTE_EXCLUSION_NAMES.indexOf(attributeName) == -1) {
        attributeValue = attribute.value;
        // If img attribute is "title", insert a title element into SVG element
        if (attributeName == _TITLE_) {
          var titleElem;
          var firstElementChild = svgElem.firstElementChild;
          if (firstElementChild && firstElementChild.localName.toLowerCase() == _TITLE_) {
            // If the SVG element's first child is a title element, keep it as the title element
            titleElem = firstElementChild;
          } else {
            // If the SVG element's first child element is not a title element, create a new title
            // ele,emt and set it as the first child
            titleElem = document[_CREATE_ELEMENT_ + 'NS']('http://www.w3.org/2000/svg', _TITLE_);
            svgElem.insertBefore(titleElem, firstElementChild);
          }
          // Set new title content
          titleElem.textContent = attributeValue;
        } else {
          // Set img attribute to svg element
          svgElem[_SET_ATTRIBUTE_](attributeName, attributeValue);
        }
      }
    }
  }


  // This function appends a suffix to IDs of referenced elements in the <defs> in order to  to avoid ID collision
  // between multiple injected SVGs. The suffix has the form "--inject-X", where X is a running number which is
  // incremented with each injection. References to the IDs are adjusted accordingly.
  // We assume tha all IDs within the injected SVG are unique, therefore the same suffix can be used for all IDs of one
  // injected SVG.
  // If the onlyReferenced argument is set to true, only those IDs will be made unique that are referenced from within the SVG
  function makeIdsUnique(svgElem, onlyReferenced) {
    var idSuffix = ID_SUFFIX + uniqueIdCounter++;
    // Regular expression for functional notations of an IRI references. This will find occurences in the form
    // url(#anyId) or url("#anyId") (for Internet Explorer) and capture the referenced ID
    var funcIriRegex = /url\("?#([a-zA-Z][\w:.-]*)"?\)/g;
    // Get all elements with an ID. The SVG spec recommends to put referenced elements inside <defs> elements, but
    // this is not a requirement, therefore we have to search for IDs in the whole SVG.
    var idElements = svgElem.querySelectorAll('[id]');
    var idElem;
    // An object containing referenced IDs  as keys is used if only referenced IDs should be uniquified.
    // If this object does not exist, all IDs will be uniquified.
    var referencedIds = onlyReferenced ? [] : NULL;
    var tagName;
    var iriTagNames = {};
    var iriProperties = [];
    var changed = false;
    var i, j;

    if (idElements[_LENGTH_]) {
      // Make all IDs unique by adding the ID suffix and collect all encountered tag names
      // that are IRI referenceable from properities.
      for (i = 0; i < idElements[_LENGTH_]; i++) {
        tagName = idElements[i].localName; // Use non-namespaced tag name
        // Make ID unique if tag name is IRI referenceable
        if (tagName in IRI_TAG_PROPERTIES_MAP) {
          iriTagNames[tagName] = 1;
        }
      }
      // Get all properties that are mapped to the found IRI referenceable tags
      for (tagName in iriTagNames) {
        (IRI_TAG_PROPERTIES_MAP[tagName] || [tagName]).forEach(function (mappedProperty) {
          // Add mapped properties to array of iri referencing properties.
          // Use linear search here because the number of possible entries is very small (maximum 11)
          if (iriProperties.indexOf(mappedProperty) < 0) {
            iriProperties.push(mappedProperty);
          }
        });
      }
      if (iriProperties[_LENGTH_]) {
        // Add "style" to properties, because it may contain references in the form 'style="fill:url(#myFill)"'
        iriProperties.push(_STYLE_);
      }
      // Run through all elements of the SVG and replace IDs in references.
      // To get all descending elements, getElementsByTagName('*') seems to perform faster than querySelectorAll('*').
      // Since svgElem.getElementsByTagName('*') does not return the svg element itself, we have to handle it separately.
      var descElements = svgElem[_GET_ELEMENTS_BY_TAG_NAME_]('*');
      var element = svgElem;
      var propertyName;
      var value;
      var newValue;
      for (i = -1; element != NULL;) {
        if (element.localName == _STYLE_) {
          // If element is a style element, replace IDs in all occurences of "url(#anyId)" in text content
          value = element.textContent;
          newValue = value && value.replace(funcIriRegex, function(match, id) {
            if (referencedIds) {
              referencedIds[id] = 1;
            }
            return 'url(#' + id + idSuffix + ')';
          });
          if (newValue !== value) {
            element.textContent = newValue;
          }
        } else if (element.hasAttributes()) {
          // Run through all property names for which IDs were found
          for (j = 0; j < iriProperties[_LENGTH_]; j++) {
            propertyName = iriProperties[j];
            value = element[_GET_ATTRIBUTE_](propertyName);
            newValue = value && value.replace(funcIriRegex, function(match, id) {
              if (referencedIds) {
                referencedIds[id] = 1;
              }
                return 'url(#' + id + idSuffix + ')';
            });
            if (newValue !== value) {
              element[_SET_ATTRIBUTE_](propertyName, newValue);
            }
          }
          // Replace IDs in xlink:ref and href attributes
          ['xlink:href', 'href'].forEach(function(refAttrName) {
            var iri = element[_GET_ATTRIBUTE_](refAttrName);
            if (/^\s*#/.test(iri)) { // Check if iri is non-null and internal reference
              iri = iri.trim();
              element[_SET_ATTRIBUTE_](refAttrName, iri + idSuffix);
              if (referencedIds) {
                // Add ID to referenced IDs
                referencedIds[iri.substring(1)] = 1;
              }
            }
          });
        }
        element = descElements[++i];
      }
      for (i = 0; i < idElements[_LENGTH_]; i++) {
        idElem = idElements[i];
        // If set of referenced IDs exists, make only referenced IDs unique,
        // otherwise make all IDs unique.
        if (!referencedIds || referencedIds[idElem.id]) {
          // Add suffix to element's ID
          idElem.id += idSuffix;
          changed = true;
        }
      }
    }
    // return true if SVG element has changed
    return changed;
  }


  // For cached SVGs the IDs are made unique by simply replacing the already inserted unique IDs with a
  // higher ID counter. This is much more performant than a call to makeIdsUnique().
  function makeIdsUniqueCached(svgString) {
    return svgString.replace(ID_SUFFIX_REGEX, ID_SUFFIX + uniqueIdCounter++);
  }


  // Inject SVG by replacing the img element with the SVG element in the DOM
  function inject(imgElem, svgElem, absUrl, options) {
    if (svgElem) {
      svgElem[_SET_ATTRIBUTE_]('data-inject-url', absUrl);
      var parentNode = imgElem.parentNode;
      if (parentNode) {
        if (options.copyAttributes) {
          copyAttributes(imgElem, svgElem);
        }
        // Invoke beforeInject hook if set
        var beforeInject = options.beforeInject;
        var injectElem = (beforeInject && beforeInject(imgElem, svgElem)) || svgElem;
        // Replace img element with new element. This is the actual injection.
        parentNode.replaceChild(injectElem, imgElem);
        // Mark img element as injected
        imgElem[__SVGINJECT] = INJECTED;
        removeOnLoadAttribute(imgElem);
        // Invoke afterInject hook if set
        var afterInject = options.afterInject;
        if (afterInject) {
          afterInject(imgElem, injectElem);
        }
      }
    } else {
      svgInvalid(imgElem, options);
    }
  }


  // Merges any number of options objects into a new object
  function mergeOptions() {
    var mergedOptions = {};
    var args = arguments;
    // Iterate over all specified options objects and add all properties to the new options object
    for (var i = 0; i < args[_LENGTH_]; i++) {
      var argument = args[i];
        for (var key in argument) {
          if (argument.hasOwnProperty(key)) {
            mergedOptions[key] = argument[key];
          }
        }
      }
    return mergedOptions;
  }


  // Adds the specified CSS to the document's <head> element
  function addStyleToHead(css) {
    var head = document[_GET_ELEMENTS_BY_TAG_NAME_]('head')[0];
    if (head) {
      var style = document[_CREATE_ELEMENT_](_STYLE_);
      style.type = 'text/css';
      style.appendChild(document.createTextNode(css));
      head.appendChild(style);
    }
  }


  // Builds an SVG element from the specified SVG string
  function buildSvgElement(svgStr, verify) {
    if (verify) {
      var svgDoc;
      try {
        // Parse the SVG string with DOMParser
        svgDoc = svgStringToSvgDoc(svgStr);
      } catch(e) {
        return NULL;
      }
      if (svgDoc[_GET_ELEMENTS_BY_TAG_NAME_]('parsererror')[_LENGTH_]) {
        // DOMParser does not throw an exception, but instead puts parsererror tags in the document
        return NULL;
      }
      return svgDoc.documentElement;
    } else {
      var div = document.createElement('div');
      div.innerHTML = svgStr;
      return div.firstElementChild;
    }
  }


  function removeOnLoadAttribute(imgElem) {
    // Remove the onload attribute. Should only be used to remove the unstyled image flash protection and
    // make the element visible, not for removing the event listener.
    imgElem.removeAttribute('onload');
  }


  function errorMessage(msg) {
    console.error('SVGInject: ' + msg);
  }


  function fail(imgElem, status, options) {
    imgElem[__SVGINJECT] = FAIL;
    if (options.onFail) {
      options.onFail(imgElem, status);
    } else {
      errorMessage(status);
    }
  }


  function svgInvalid(imgElem, options) {
    removeOnLoadAttribute(imgElem);
    fail(imgElem, SVG_INVALID, options);
  }


  function svgNotSupported(imgElem, options) {
    removeOnLoadAttribute(imgElem);
    fail(imgElem, SVG_NOT_SUPPORTED, options);
  }


  function loadFail(imgElem, options) {
    fail(imgElem, LOAD_FAIL, options);
  }


  function removeEventListeners(imgElem) {
    imgElem.onload = NULL;
    imgElem.onerror = NULL;
  }


  function imgNotSet(msg) {
    errorMessage('no img element');
  }


  function createSVGInject(globalName, options) {
    var defaultOptions = mergeOptions(DEFAULT_OPTIONS, options);
    var svgLoadCache = {};

    if (IS_SVG_SUPPORTED) {
      // If the browser supports SVG, add a small stylesheet that hides the <img> elements until
      // injection is finished. This avoids showing the unstyled SVGs before style is applied.
      addStyleToHead('img[onload^="' + globalName + '("]{visibility:hidden;}');
    }


    /**
     * SVGInject
     *
     * Injects the SVG specified in the `src` attribute of the specified `img` element or array of `img`
     * elements. Returns a Promise object which resolves if all passed in `img` elements have either been
     * injected or failed to inject (Only if a global Promise object is available like in all modern browsers
     * or through a polyfill).
     *
     * Options:
     * useCache: If set to `true` the SVG will be cached using the absolute URL. Default value is `true`.
     * copyAttributes: If set to `true` the attributes will be copied from `img` to `svg`. Dfault value
     *     is `true`.
     * makeIdsUnique: If set to `true` the ID of elements in the `<defs>` element that can be references by
     *     property values (for example 'clipPath') are made unique by appending "--inject-X", where X is a
     *     running number which increases with each injection. This is done to avoid duplicate IDs in the DOM.
     * beforeLoad: Hook before SVG is loaded. The `img` element is passed as a parameter. If the hook returns
     *     a string it is used as the URL instead of the `img` element's `src` attribute.
     * afterLoad: Hook after SVG is loaded. The loaded `svg` element and `svg` string are passed as a
     *     parameters. If caching is active this hook will only get called once for injected SVGs with the
     *     same absolute path. Changes to the `svg` element in this hook will be applied to all injected SVGs
     *     with the same absolute path. It's also possible to return an `svg` string or `svg` element which
     *     will then be used for the injection.
     * beforeInject: Hook before SVG is injected. The `img` and `svg` elements are passed as parameters. If
     *     any html element is returned it gets injected instead of applying the default SVG injection.
     * afterInject: Hook after SVG is injected. The `img` and `svg` elements are passed as parameters.
     * onAllFinish: Hook after all `img` elements passed to an SVGInject() call have either been injected or
     *     failed to inject.
     * onFail: Hook after injection fails. The `img` element and a `status` string are passed as an parameter.
     *     The `status` can be either `'SVG_NOT_SUPPORTED'` (the browser does not support SVG),
     *     `'SVG_INVALID'` (the SVG is not in a valid format) or `'LOAD_FAILED'` (loading of the SVG failed).
     *
     * @param {HTMLImageElement} img - an img element or an array of img elements
     * @param {Object} [options] - optional parameter with [options](#options) for this injection.
     */
    function SVGInject(img, options) {
      options = mergeOptions(defaultOptions, options);

      var run = function(resolve) {
        var allFinish = function() {
          var onAllFinish = options.onAllFinish;
          if (onAllFinish) {
            onAllFinish();
          }
          resolve && resolve();
        };

        if (img && typeof img[_LENGTH_] != _UNDEFINED_) {
          // an array like structure of img elements
          var injectIndex = 0;
          var injectCount = img[_LENGTH_];

          if (injectCount == 0) {
            allFinish();
          } else {
            var finish = function() {
              if (++injectIndex == injectCount) {
                allFinish();
              }
            };

            for (var i = 0; i < injectCount; i++) {
              SVGInjectElement(img[i], options, finish);
            }
          }
        } else {
          // only one img element
          SVGInjectElement(img, options, allFinish);
        }
      };

      // return a Promise object if globally available
      return typeof Promise == _UNDEFINED_ ? run() : new Promise(run);
    }


    // Injects a single svg element. Options must be already merged with the default options.
    function SVGInjectElement(imgElem, options, callback) {
      if (imgElem) {
        var svgInjectAttributeValue = imgElem[__SVGINJECT];
        if (!svgInjectAttributeValue) {
          removeEventListeners(imgElem);

          if (!IS_SVG_SUPPORTED) {
            svgNotSupported(imgElem, options);
            callback();
            return;
          }
          // Invoke beforeLoad hook if set. If the beforeLoad returns a value use it as the src for the load
          // URL path. Else use the imgElem's src attribute value.
          var beforeLoad = options.beforeLoad;
          var src = (beforeLoad && beforeLoad(imgElem)) || imgElem[_GET_ATTRIBUTE_]('src');

          if (!src) {
            // If no image src attribute is set do no injection. This can only be reached by using javascript
            // because if no src attribute is set the onload and onerror events do not get called
            if (src === '') {
              loadFail(imgElem, options);
            }
            callback();
            return;
          }

          // set array so later calls can register callbacks
          var onFinishCallbacks = [];
          imgElem[__SVGINJECT] = onFinishCallbacks;

          var onFinish = function() {
            callback();
            onFinishCallbacks.forEach(function(onFinishCallback) {
              onFinishCallback();
            });
          };

          var absUrl = getAbsoluteUrl(src);
          var useCacheOption = options.useCache;
          var makeIdsUniqueOption = options.makeIdsUnique;
          
          var setSvgLoadCacheValue = function(val) {
            if (useCacheOption) {
              svgLoadCache[absUrl].forEach(function(svgLoad) {
                svgLoad(val);
              });
              svgLoadCache[absUrl] = val;
            }
          };

          if (useCacheOption) {
            var svgLoad = svgLoadCache[absUrl];

            var handleLoadValue = function(loadValue) {
              if (loadValue === LOAD_FAIL) {
                loadFail(imgElem, options);
              } else if (loadValue === SVG_INVALID) {
                svgInvalid(imgElem, options);
              } else {
                var hasUniqueIds = loadValue[0];
                var svgString = loadValue[1];
                var uniqueIdsSvgString = loadValue[2];
                var svgElem;

                if (makeIdsUniqueOption) {
                  if (hasUniqueIds === NULL) {
                    // IDs for the SVG string have not been made unique before. This may happen if previous
                    // injection of a cached SVG have been run with the option makedIdsUnique set to false
                    svgElem = buildSvgElement(svgString, false);
                    hasUniqueIds = makeIdsUnique(svgElem, false);

                    loadValue[0] = hasUniqueIds;
                    loadValue[2] = hasUniqueIds && svgElemToSvgString(svgElem);
                  } else if (hasUniqueIds) {
                    // Make IDs unique for already cached SVGs with better performance
                    svgString = makeIdsUniqueCached(uniqueIdsSvgString);
                  }
                }

                svgElem = svgElem || buildSvgElement(svgString, false);

                inject(imgElem, svgElem, absUrl, options);
              }
              onFinish();
            };

            if (typeof svgLoad != _UNDEFINED_) {
              // Value for url exists in cache
              if (svgLoad.isCallbackQueue) {
                // Same url has been cached, but value has not been loaded yet, so add to callbacks
                svgLoad.push(handleLoadValue);
              } else {
                handleLoadValue(svgLoad);
              }
              return;
            } else {
              var svgLoad = [];
              // set property isCallbackQueue to Array to differentiate from array with cached loaded values
              svgLoad.isCallbackQueue = true;
              svgLoadCache[absUrl] = svgLoad;
            }
          }

          // Load the SVG because it is not cached or caching is disabled
          loadSvg(absUrl, function(svgXml, svgString) {
            // Use the XML from the XHR request if it is an instance of Document. Otherwise
            // (for example of IE9), create the svg document from the svg string.
            var svgElem = svgXml instanceof Document ? svgXml.documentElement : buildSvgElement(svgString, true);

            var afterLoad = options.afterLoad;
            if (afterLoad) {
              // Invoke afterLoad hook which may modify the SVG element. After load may also return a new
              // svg element or svg string
              var svgElemOrSvgString = afterLoad(svgElem, svgString) || svgElem;
              if (svgElemOrSvgString) {
                // Update svgElem and svgString because of modifications to the SVG element or SVG string in
                // the afterLoad hook, so the modified SVG is also used for all later cached injections
                var isString = typeof svgElemOrSvgString == 'string';
                svgString = isString ? svgElemOrSvgString : svgElemToSvgString(svgElem);
                svgElem = isString ? buildSvgElement(svgElemOrSvgString, true) : svgElemOrSvgString;
              }
            }

            if (svgElem instanceof SVGElement) {
              var hasUniqueIds = NULL;
              if (makeIdsUniqueOption) {
                hasUniqueIds = makeIdsUnique(svgElem, false);
              }

              if (useCacheOption) {
                var uniqueIdsSvgString = hasUniqueIds && svgElemToSvgString(svgElem);
                // set an array with three entries to the load cache
                setSvgLoadCacheValue([hasUniqueIds, svgString, uniqueIdsSvgString]);
              }

              inject(imgElem, svgElem, absUrl, options);
            } else {
              svgInvalid(imgElem, options);
              setSvgLoadCacheValue(SVG_INVALID);
            }
            onFinish();
          }, function() {
            loadFail(imgElem, options);
            setSvgLoadCacheValue(LOAD_FAIL);
            onFinish();
          });
        } else {
          if (Array.isArray(svgInjectAttributeValue)) {
            // svgInjectAttributeValue is an array. Injection is not complete so register callback
            svgInjectAttributeValue.push(callback);
          } else {
            callback();
          }
        }
      } else {
        imgNotSet();
      }
    }


    /**
     * Sets the default [options](#options) for SVGInject.
     *
     * @param {Object} [options] - default [options](#options) for an injection.
     */
    SVGInject.setOptions = function(options) {
      defaultOptions = mergeOptions(defaultOptions, options);
    };


    // Create a new instance of SVGInject
    SVGInject.create = createSVGInject;


    /**
     * Used in onerror Event of an `<img>` element to handle cases when the loading the original src fails
     * (for example if file is not found or if the browser does not support SVG). This triggers a call to the
     * options onFail hook if available. The optional second parameter will be set as the new src attribute
     * for the img element.
     *
     * @param {HTMLImageElement} img - an img element
     * @param {String} [fallbackSrc] - optional parameter fallback src
     */
    SVGInject.err = function(img, fallbackSrc) {
      if (img) {
        if (img[__SVGINJECT] != FAIL) {
          removeEventListeners(img);

          if (!IS_SVG_SUPPORTED) {
            svgNotSupported(img, defaultOptions);
          } else {
            removeOnLoadAttribute(img);
            loadFail(img, defaultOptions);
          }
          if (fallbackSrc) {
            removeOnLoadAttribute(img);
            img.src = fallbackSrc;
          }
        }
      } else {
        imgNotSet();
      }
    };

    window[globalName] = SVGInject;

    return SVGInject;
  }

  var SVGInjectInstance = createSVGInject('SVGInject');

  if ( true && typeof module.exports == 'object') {
    module.exports = SVGInjectInstance;
  }
})(window, document);

/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/app.css":
/*!***********************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/app.css ***!
  \***********************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/getUrl.js */ "./node_modules/css-loader/dist/runtime/getUrl.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__);
// Imports



var ___CSS_LOADER_URL_IMPORT_0___ = new URL(/* asset import */ __webpack_require__(/*! ./assets/fonts/Roboto_Condensed/static/RobotoCondensed-Medium.ttf */ "./src/assets/fonts/Roboto_Condensed/static/RobotoCondensed-Medium.ttf"), __webpack_require__.b);
var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
var ___CSS_LOADER_URL_REPLACEMENT_0___ = _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default()(___CSS_LOADER_URL_IMPORT_0___);
// Module
___CSS_LOADER_EXPORT___.push([module.id, `@font-face {
  /* https://fonts.google.com/specimen/Roboto+Condensed */
  font-family: 'Roboto Condensed';
  src: url(${___CSS_LOADER_URL_REPLACEMENT_0___});
  font-weight: 600;
  font-style: normal;
}

:root {
  --color-font-primary: #000000;
  --color-font-secondary: #e8e9eb;
  --color-background-primary: #313638;
  --color-background-secondary: #f06543;
  --color-background-default: #ffffff;
  --color-accent: #f09d51;
  --color-box-shadow: #000000;
  --flex-gap-small: 0.5rem;
  --padding-small-btn: 0.5rem;
  --padding-med-btn: 1rem;
  --padding-large-btn: 2rem;
  --border-radius-btn: 0.5rem;
}

*,
*::before,
*::after {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-size: 16px;
}

body {
  min-height: 100svh;
  background-color: rgb(149, 116, 59);
  font-family: 'Roboto Condensed', Arial;
  font-family: 'Roboto Condensed';
  font-family: Arial;
}

#battleship_app {
  min-height: inherit;
  display: grid;
  grid-template-rows: min-content 1fr;
}

#main_content {
  /* Temporary */
  /* margin-top: 4em; */
}

#main_content > :first-child {
  height: 100%;
  display: flex;
  justify-content: center;
}
`, "",{"version":3,"sources":["webpack://./src/app.css"],"names":[],"mappings":"AAAA;EACE,uDAAuD;EACvD,+BAA+B;EAC/B,4CAA2E;EAC3E,gBAAgB;EAChB,kBAAkB;AACpB;;AAEA;EACE,6BAA6B;EAC7B,+BAA+B;EAC/B,mCAAmC;EACnC,qCAAqC;EACrC,mCAAmC;EACnC,uBAAuB;EACvB,2BAA2B;EAC3B,wBAAwB;EACxB,2BAA2B;EAC3B,uBAAuB;EACvB,yBAAyB;EACzB,2BAA2B;AAC7B;;AAEA;;;EAGE,UAAU;EACV,SAAS;EACT,sBAAsB;EACtB,eAAe;AACjB;;AAEA;EACE,kBAAkB;EAClB,mCAAmC;EACnC,sCAAsC;EACtC,+BAA+B;EAC/B,kBAAkB;AACpB;;AAEA;EACE,mBAAmB;EACnB,aAAa;EACb,mCAAmC;AACrC;;AAEA;EACE,cAAc;EACd,qBAAqB;AACvB;;AAEA;EACE,YAAY;EACZ,aAAa;EACb,uBAAuB;AACzB","sourcesContent":["@font-face {\n  /* https://fonts.google.com/specimen/Roboto+Condensed */\n  font-family: 'Roboto Condensed';\n  src: url(./assets/fonts/Roboto_Condensed/static/RobotoCondensed-Medium.ttf);\n  font-weight: 600;\n  font-style: normal;\n}\n\n:root {\n  --color-font-primary: #000000;\n  --color-font-secondary: #e8e9eb;\n  --color-background-primary: #313638;\n  --color-background-secondary: #f06543;\n  --color-background-default: #ffffff;\n  --color-accent: #f09d51;\n  --color-box-shadow: #000000;\n  --flex-gap-small: 0.5rem;\n  --padding-small-btn: 0.5rem;\n  --padding-med-btn: 1rem;\n  --padding-large-btn: 2rem;\n  --border-radius-btn: 0.5rem;\n}\n\n*,\n*::before,\n*::after {\n  padding: 0;\n  margin: 0;\n  box-sizing: border-box;\n  font-size: 16px;\n}\n\nbody {\n  min-height: 100svh;\n  background-color: rgb(149, 116, 59);\n  font-family: 'Roboto Condensed', Arial;\n  font-family: 'Roboto Condensed';\n  font-family: Arial;\n}\n\n#battleship_app {\n  min-height: inherit;\n  display: grid;\n  grid-template-rows: min-content 1fr;\n}\n\n#main_content {\n  /* Temporary */\n  /* margin-top: 4em; */\n}\n\n#main_content > :first-child {\n  height: 100%;\n  display: flex;\n  justify-content: center;\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/styles/header.css":
/*!*********************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/styles/header.css ***!
  \*********************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `#header {
  padding: 1em 1em 3em;
  background-color: rgb(165, 165, 165);
}
`, "",{"version":3,"sources":["webpack://./src/styles/header.css"],"names":[],"mappings":"AAAA;EACE,oBAAoB;EACpB,oCAAoC;AACtC","sourcesContent":["#header {\n  padding: 1em 1em 3em;\n  background-color: rgb(165, 165, 165);\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/styles/home.css":
/*!*******************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/styles/home.css ***!
  \*******************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `#home {
}

.gamemode_btns {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2em;
}

.gamemode_btns > * {
  padding: var(--padding-large-btn);
  border-radius: var(--border-radius-btn);
  border: none;
}

.gamemode_btns > *:hover {
  cursor: pointer;
  box-shadow: 0rem 0rem 0.5rem 0rem black;
}

.gamemode_btns > *:active {
  background: black;
  color: white;
}

.gamemode_btns > * > span {
  font-size: 2em;
}
`, "",{"version":3,"sources":["webpack://./src/styles/home.css"],"names":[],"mappings":"AAAA;AACA;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,uBAAuB;EACvB,QAAQ;AACV;;AAEA;EACE,iCAAiC;EACjC,uCAAuC;EACvC,YAAY;AACd;;AAEA;EACE,eAAe;EACf,uCAAuC;AACzC;;AAEA;EACE,iBAAiB;EACjB,YAAY;AACd;;AAEA;EACE,cAAc;AAChB","sourcesContent":["#home {\n}\n\n.gamemode_btns {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  gap: 2em;\n}\n\n.gamemode_btns > * {\n  padding: var(--padding-large-btn);\n  border-radius: var(--border-radius-btn);\n  border: none;\n}\n\n.gamemode_btns > *:hover {\n  cursor: pointer;\n  box-shadow: 0rem 0rem 0.5rem 0rem black;\n}\n\n.gamemode_btns > *:active {\n  background: black;\n  color: white;\n}\n\n.gamemode_btns > * > span {\n  font-size: 2em;\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/styles/navbar.css":
/*!*********************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/styles/navbar.css ***!
  \*********************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `#navbar {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

#navbar > * {
  display: flex;
  list-style: none;
  align-items: center;
  gap: var(--flex-gap-small);
}

.nav_right {
  position: relative;
}

.nav_right > :last-child {
  /* Experimenting */
  position: absolute;
  right: 0;
  top: 2.5em;
  padding: 1rem;
}

.nav_item {
  color: var(--color-font-primary);
  font-style: normal;
  font-size: 1.2rem;
  text-decoration: none;
}

.nav_item:not(.github):hover {
  color: white;
}

.nav_item > svg {
  color: white;
  width: 2.5rem;
  height: auto;
}

.nav_item > .github_logo:hover {
  color: rgb(149, 0, 255);
  animation: linear 2s infinite rotate;
}

.nav_item.nav_logo {
  display: flex;
  align-items: center;
  gap: var(--flex-gap-small);
}

.nav_item.nav_logo > h1 {
  font-size: 2rem;
}

.leave_game.inactive {
  display: none;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
`, "",{"version":3,"sources":["webpack://./src/styles/navbar.css"],"names":[],"mappings":"AAAA;EACE,aAAa;EACb,8BAA8B;EAC9B,kBAAkB;EAClB,UAAU;AACZ;;AAEA;EACE,aAAa;EACb,gBAAgB;EAChB,mBAAmB;EACnB,0BAA0B;AAC5B;;AAEA;EACE,kBAAkB;AACpB;;AAEA;EACE,kBAAkB;EAClB,kBAAkB;EAClB,QAAQ;EACR,UAAU;EACV,aAAa;AACf;;AAEA;EACE,gCAAgC;EAChC,kBAAkB;EAClB,iBAAiB;EACjB,qBAAqB;AACvB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,YAAY;EACZ,aAAa;EACb,YAAY;AACd;;AAEA;EACE,uBAAuB;EACvB,oCAAoC;AACtC;;AAEA;EACE,aAAa;EACb,mBAAmB;EACnB,0BAA0B;AAC5B;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE;IACE,uBAAuB;EACzB;;EAEA;IACE,yBAAyB;EAC3B;AACF","sourcesContent":["#navbar {\n  display: flex;\n  justify-content: space-between;\n  position: relative;\n  z-index: 1;\n}\n\n#navbar > * {\n  display: flex;\n  list-style: none;\n  align-items: center;\n  gap: var(--flex-gap-small);\n}\n\n.nav_right {\n  position: relative;\n}\n\n.nav_right > :last-child {\n  /* Experimenting */\n  position: absolute;\n  right: 0;\n  top: 2.5em;\n  padding: 1rem;\n}\n\n.nav_item {\n  color: var(--color-font-primary);\n  font-style: normal;\n  font-size: 1.2rem;\n  text-decoration: none;\n}\n\n.nav_item:not(.github):hover {\n  color: white;\n}\n\n.nav_item > svg {\n  color: white;\n  width: 2.5rem;\n  height: auto;\n}\n\n.nav_item > .github_logo:hover {\n  color: rgb(149, 0, 255);\n  animation: linear 2s infinite rotate;\n}\n\n.nav_item.nav_logo {\n  display: flex;\n  align-items: center;\n  gap: var(--flex-gap-small);\n}\n\n.nav_item.nav_logo > h1 {\n  font-size: 2rem;\n}\n\n.leave_game.inactive {\n  display: none;\n}\n\n@keyframes rotate {\n  0% {\n    transform: rotate(0deg);\n  }\n\n  100% {\n    transform: rotate(360deg);\n  }\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/styles/notifications.css":
/*!****************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/styles/notifications.css ***!
  \****************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `#notifications_container {
  /* display: flex;
  justify-content: center; */

  width: 100%;
  left: 0;
  top: 0;
  position: absolute;
}

#notifications_container > .notification_wrapper {
  /* width: 30%;
  padding: 1rem; */
  display: flex;
  justify-content: center;
  margin: 60px auto;
  width: 40%;
  height: max-content;
  background: #f8f8f8;
  padding: 0.5em;
  user-select: none;
}

#notifications_container.gameover {
  height: 100%;
  z-index: 999;
  background: rgba(255, 255, 255, 0.5);
}

#notifications_container.gameover > .notification_wrapper {
  padding: 1rem;
  background-color: rgb(8, 195, 8);
  flex-direction: column;
  gap: 1rem;
  animation: slideIn_top 500ms ease-out;
}

.notification_wrapper > .play_again {
  color: var(--color-font-primary);
  text-decoration: none;
  padding: var(--padding-small-btn);
  background-color: lightgray;
  width: max-content;
  border-radius: var(--border-radius-btn);
}

.notification_wrapper > .play_again:hover {
  box-shadow: 0rem 0rem 0.3rem -0.1rem black;
  background: rgba(255, 255, 255, 0.6);
}

@keyframes slideIn_top {
  from {
    transform: translateY(-2000px);
  }

  to {
    transform: translateY(0);
  }
}
`, "",{"version":3,"sources":["webpack://./src/styles/notifications.css"],"names":[],"mappings":"AAAA;EACE;4BAC0B;;EAE1B,WAAW;EACX,OAAO;EACP,MAAM;EACN,kBAAkB;AACpB;;AAEA;EACE;kBACgB;EAChB,aAAa;EACb,uBAAuB;EACvB,iBAAiB;EACjB,UAAU;EACV,mBAAmB;EACnB,mBAAmB;EACnB,cAAc;EACd,iBAAiB;AACnB;;AAEA;EACE,YAAY;EACZ,YAAY;EACZ,oCAAoC;AACtC;;AAEA;EACE,aAAa;EACb,gCAAgC;EAChC,sBAAsB;EACtB,SAAS;EACT,qCAAqC;AACvC;;AAEA;EACE,gCAAgC;EAChC,qBAAqB;EACrB,iCAAiC;EACjC,2BAA2B;EAC3B,kBAAkB;EAClB,uCAAuC;AACzC;;AAEA;EACE,0CAA0C;EAC1C,oCAAoC;AACtC;;AAEA;EACE;IACE,8BAA8B;EAChC;;EAEA;IACE,wBAAwB;EAC1B;AACF","sourcesContent":["#notifications_container {\n  /* display: flex;\n  justify-content: center; */\n\n  width: 100%;\n  left: 0;\n  top: 0;\n  position: absolute;\n}\n\n#notifications_container > .notification_wrapper {\n  /* width: 30%;\n  padding: 1rem; */\n  display: flex;\n  justify-content: center;\n  margin: 60px auto;\n  width: 40%;\n  height: max-content;\n  background: #f8f8f8;\n  padding: 0.5em;\n  user-select: none;\n}\n\n#notifications_container.gameover {\n  height: 100%;\n  z-index: 999;\n  background: rgba(255, 255, 255, 0.5);\n}\n\n#notifications_container.gameover > .notification_wrapper {\n  padding: 1rem;\n  background-color: rgb(8, 195, 8);\n  flex-direction: column;\n  gap: 1rem;\n  animation: slideIn_top 500ms ease-out;\n}\n\n.notification_wrapper > .play_again {\n  color: var(--color-font-primary);\n  text-decoration: none;\n  padding: var(--padding-small-btn);\n  background-color: lightgray;\n  width: max-content;\n  border-radius: var(--border-radius-btn);\n}\n\n.notification_wrapper > .play_again:hover {\n  box-shadow: 0rem 0rem 0.3rem -0.1rem black;\n  background: rgba(255, 255, 255, 0.6);\n}\n\n@keyframes slideIn_top {\n  from {\n    transform: translateY(-2000px);\n  }\n\n  to {\n    transform: translateY(0);\n  }\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/styles/port.css":
/*!*******************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/styles/port.css ***!
  \*******************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `.port.inactive {
  display: none;
}

.port_lines {
  display: flex;
}

.port_ship {
  position: relative;
  border: 1px dotted #b2b2b9;
  margin: 0.5em;
  box-sizing: content-box;
}

.ship_box {
  z-index: 2;
  left: 0;
  top: 0;
  border: 2px solid #00f;
  background: rgba(0, 0, 255, 0.05);
  position: absolute !important;
  margin: -2px;
  box-sizing: content-box;
}

.ship_box:hover {
  cursor: move;
}

.ship_box.dragging.ship_box_transparent {
  background: transparent;
  border: transparent;
}

.ship_box_placeholder {
  border-color: #40bf44;
  background: rgba(64, 191, 68, 0.05);
}

.rotate_error {
  border-color: red;
  animation: linear 0.005s infinite shake;
}

.btns_container {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  gap: 0.25rem;
}

.btns_container > * > button {
  padding: 0.5rem 1rem;
}

.btns_container > * > button:hover {
  cursor: pointer;
  color: #04a204;
}

.reset_btn.inactive {
  pointer-events: none;
}

.reset_btn.inactive > span {
  opacity: 0.5;
}

.random_btn {
  /* display: none; */
}

.ready_btn.inactive {
  display: none;
}

@keyframes shake {
  0% {
    left: -5px;
  }

  50% {
    left: 0px;
  }

  100% {
    left: 5px;
  }
}
`, "",{"version":3,"sources":["webpack://./src/styles/port.css"],"names":[],"mappings":"AAAA;EACE,aAAa;AACf;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,kBAAkB;EAClB,0BAA0B;EAC1B,aAAa;EACb,uBAAuB;AACzB;;AAEA;EACE,UAAU;EACV,OAAO;EACP,MAAM;EACN,sBAAsB;EACtB,iCAAiC;EACjC,6BAA6B;EAC7B,YAAY;EACZ,uBAAuB;AACzB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,uBAAuB;EACvB,mBAAmB;AACrB;;AAEA;EACE,qBAAqB;EACrB,mCAAmC;AACrC;;AAEA;EACE,iBAAiB;EACjB,uCAAuC;AACzC;;AAEA;EACE,aAAa;EACb,uBAAuB;EACvB,gBAAgB;EAChB,YAAY;AACd;;AAEA;EACE,oBAAoB;AACtB;;AAEA;EACE,eAAe;EACf,cAAc;AAChB;;AAEA;EACE,oBAAoB;AACtB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE;IACE,UAAU;EACZ;;EAEA;IACE,SAAS;EACX;;EAEA;IACE,SAAS;EACX;AACF","sourcesContent":[".port.inactive {\n  display: none;\n}\n\n.port_lines {\n  display: flex;\n}\n\n.port_ship {\n  position: relative;\n  border: 1px dotted #b2b2b9;\n  margin: 0.5em;\n  box-sizing: content-box;\n}\n\n.ship_box {\n  z-index: 2;\n  left: 0;\n  top: 0;\n  border: 2px solid #00f;\n  background: rgba(0, 0, 255, 0.05);\n  position: absolute !important;\n  margin: -2px;\n  box-sizing: content-box;\n}\n\n.ship_box:hover {\n  cursor: move;\n}\n\n.ship_box.dragging.ship_box_transparent {\n  background: transparent;\n  border: transparent;\n}\n\n.ship_box_placeholder {\n  border-color: #40bf44;\n  background: rgba(64, 191, 68, 0.05);\n}\n\n.rotate_error {\n  border-color: red;\n  animation: linear 0.005s infinite shake;\n}\n\n.btns_container {\n  display: flex;\n  justify-content: center;\n  margin-top: 1rem;\n  gap: 0.25rem;\n}\n\n.btns_container > * > button {\n  padding: 0.5rem 1rem;\n}\n\n.btns_container > * > button:hover {\n  cursor: pointer;\n  color: #04a204;\n}\n\n.reset_btn.inactive {\n  pointer-events: none;\n}\n\n.reset_btn.inactive > span {\n  opacity: 0.5;\n}\n\n.random_btn {\n  /* display: none; */\n}\n\n.ready_btn.inactive {\n  display: none;\n}\n\n@keyframes shake {\n  0% {\n    left: -5px;\n  }\n\n  50% {\n    left: 0px;\n  }\n\n  100% {\n    left: 5px;\n  }\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/styles/screenController.css":
/*!*******************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/styles/screenController.css ***!
  \*******************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `#boards_container {
  margin-top: 4em;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8rem;
  user-select: none;
}

#boards_container > * {
  height: min-content;
}

.board > * {
  display: flex;
  justify-content: center;
}

#boards_container > *.wait > *:not(.game_play) {
  opacity: 0.4;
  pointer-events: none;
}

#boards_container.busy > *:not(.wait) > * > * > * > * > .ship_box {
  display: none;
}

#boards_container.busy > * > * > * > .cell:not(.hit):not(.miss):hover {
  border-color: rgba(255, 255, 255, 0.1);
}

#boards_container.busy > * > * > * > .cell:not(.hit):not(.miss):hover > .cell_content::after {
  border: 2px solid #40bf44;
  background: rgba(64, 191, 68, 0.05);
  position: absolute;
  width: 2em;
  height: 2em;
  padding: 1em;
  top: 0px;
  left: 0;
  margin: -2px;
  content: '';
  display: block;
  cursor: pointer;
  z-index: 2;
}

.player_two.inactive {
  display: none;
}

.player_two {
  position: relative;
}

.cell {
  border: 1px solid #b4b4ff;
  padding: 0;
}

.cell.hit > .cell_content > .blank_wrapper::before,
.cell.hit > .cell_content > .blank_wrapper::after {
  content: '';
  position: absolute;
  background: red;
}

.cell.hit > .cell_content > .blank_wrapper::before {
  left: 50%;
  width: 2px;
  top: -25%;
  height: 150%;
  margin-top: 1px;
}

.cell.hit > .cell_content > .blank_wrapper::after {
  top: 50%;
  height: 2px;
  left: -25%;
  width: 150%;
  margin-left: -1px;
}

.cell.hit > .cell_content > .blank_wrapper::before,
.cell.hit > .cell_content > .blank_wrapper::after {
  transform: rotate(-45deg);
}

#boards_container > * > * > * > .hit.done > * > .ship_box {
  display: block;
  border-color: red;
}

.hit.done {
  border: 1px solid red;
}

.cell.done > .cell_content > .ship_box {
  background-color: rgba(255, 0, 0, 0.05);
}

.cell.miss > .cell_content {
  background-color: transparent;
}

.cell.miss > .cell_content > .blank_wrapper::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  height: 4px;
  width: 4px;
  background: #333;
  border-radius: 50%;
  margin-top: -2px;
  margin-left: -2px;
}

.cell.miss > .cell_content > .blank_wrapper {
  content: '';
  display: block;
  height: 2em;
  width: 2em;
  background-color: #fafad2;
}

.cell_content {
  position: relative;
  height: 2em;
  width: 2em;
}

.marker_row {
  left: -3em;
  width: 2em;
  text-align: right;
  top: 1em;
  height: 1em;
}

.marker_col {
  top: -2em;
  left: 0;
  width: 100%;
  text-align: center;
}

.marker {
  position: absolute;
  font-size: 11px;
  z-index: -1;
}

.game_play {
  display: block;
  position: absolute;
  top: 10%;
  left: 10%;
}

.game_play > .play_btn.inactive {
  display: none;
}

.game_play > .play_btn {
  padding: 0.5rem 1rem;
  box-shadow: 0px 2px 5px -2px black;
}

.game_play > .play_btn:hover {
  cursor: pointer;
}

@media screen and (min-width: 768px) {
  #boards_container {
    flex-direction: row;
  }
}
`, "",{"version":3,"sources":["webpack://./src/styles/screenController.css"],"names":[],"mappings":"AAAA;EACE,eAAe;EACf,aAAa;EACb,sBAAsB;EACtB,uBAAuB;EACvB,eAAe;EACf,SAAS;EACT,iBAAiB;AACnB;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE,aAAa;EACb,uBAAuB;AACzB;;AAEA;EACE,YAAY;EACZ,oBAAoB;AACtB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,sCAAsC;AACxC;;AAEA;EACE,yBAAyB;EACzB,mCAAmC;EACnC,kBAAkB;EAClB,UAAU;EACV,WAAW;EACX,YAAY;EACZ,QAAQ;EACR,OAAO;EACP,YAAY;EACZ,WAAW;EACX,cAAc;EACd,eAAe;EACf,UAAU;AACZ;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,kBAAkB;AACpB;;AAEA;EACE,yBAAyB;EACzB,UAAU;AACZ;;AAEA;;EAEE,WAAW;EACX,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,SAAS;EACT,UAAU;EACV,SAAS;EACT,YAAY;EACZ,eAAe;AACjB;;AAEA;EACE,QAAQ;EACR,WAAW;EACX,UAAU;EACV,WAAW;EACX,iBAAiB;AACnB;;AAEA;;EAEE,yBAAyB;AAC3B;;AAEA;EACE,cAAc;EACd,iBAAiB;AACnB;;AAEA;EACE,qBAAqB;AACvB;;AAEA;EACE,uCAAuC;AACzC;;AAEA;EACE,6BAA6B;AAC/B;;AAEA;EACE,WAAW;EACX,kBAAkB;EAClB,QAAQ;EACR,SAAS;EACT,WAAW;EACX,UAAU;EACV,gBAAgB;EAChB,kBAAkB;EAClB,gBAAgB;EAChB,iBAAiB;AACnB;;AAEA;EACE,WAAW;EACX,cAAc;EACd,WAAW;EACX,UAAU;EACV,yBAAyB;AAC3B;;AAEA;EACE,kBAAkB;EAClB,WAAW;EACX,UAAU;AACZ;;AAEA;EACE,UAAU;EACV,UAAU;EACV,iBAAiB;EACjB,QAAQ;EACR,WAAW;AACb;;AAEA;EACE,SAAS;EACT,OAAO;EACP,WAAW;EACX,kBAAkB;AACpB;;AAEA;EACE,kBAAkB;EAClB,eAAe;EACf,WAAW;AACb;;AAEA;EACE,cAAc;EACd,kBAAkB;EAClB,QAAQ;EACR,SAAS;AACX;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,oBAAoB;EACpB,kCAAkC;AACpC;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE;IACE,mBAAmB;EACrB;AACF","sourcesContent":["#boards_container {\n  margin-top: 4em;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  flex-wrap: wrap;\n  gap: 8rem;\n  user-select: none;\n}\n\n#boards_container > * {\n  height: min-content;\n}\n\n.board > * {\n  display: flex;\n  justify-content: center;\n}\n\n#boards_container > *.wait > *:not(.game_play) {\n  opacity: 0.4;\n  pointer-events: none;\n}\n\n#boards_container.busy > *:not(.wait) > * > * > * > * > .ship_box {\n  display: none;\n}\n\n#boards_container.busy > * > * > * > .cell:not(.hit):not(.miss):hover {\n  border-color: rgba(255, 255, 255, 0.1);\n}\n\n#boards_container.busy > * > * > * > .cell:not(.hit):not(.miss):hover > .cell_content::after {\n  border: 2px solid #40bf44;\n  background: rgba(64, 191, 68, 0.05);\n  position: absolute;\n  width: 2em;\n  height: 2em;\n  padding: 1em;\n  top: 0px;\n  left: 0;\n  margin: -2px;\n  content: '';\n  display: block;\n  cursor: pointer;\n  z-index: 2;\n}\n\n.player_two.inactive {\n  display: none;\n}\n\n.player_two {\n  position: relative;\n}\n\n.cell {\n  border: 1px solid #b4b4ff;\n  padding: 0;\n}\n\n.cell.hit > .cell_content > .blank_wrapper::before,\n.cell.hit > .cell_content > .blank_wrapper::after {\n  content: '';\n  position: absolute;\n  background: red;\n}\n\n.cell.hit > .cell_content > .blank_wrapper::before {\n  left: 50%;\n  width: 2px;\n  top: -25%;\n  height: 150%;\n  margin-top: 1px;\n}\n\n.cell.hit > .cell_content > .blank_wrapper::after {\n  top: 50%;\n  height: 2px;\n  left: -25%;\n  width: 150%;\n  margin-left: -1px;\n}\n\n.cell.hit > .cell_content > .blank_wrapper::before,\n.cell.hit > .cell_content > .blank_wrapper::after {\n  transform: rotate(-45deg);\n}\n\n#boards_container > * > * > * > .hit.done > * > .ship_box {\n  display: block;\n  border-color: red;\n}\n\n.hit.done {\n  border: 1px solid red;\n}\n\n.cell.done > .cell_content > .ship_box {\n  background-color: rgba(255, 0, 0, 0.05);\n}\n\n.cell.miss > .cell_content {\n  background-color: transparent;\n}\n\n.cell.miss > .cell_content > .blank_wrapper::after {\n  content: '';\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  height: 4px;\n  width: 4px;\n  background: #333;\n  border-radius: 50%;\n  margin-top: -2px;\n  margin-left: -2px;\n}\n\n.cell.miss > .cell_content > .blank_wrapper {\n  content: '';\n  display: block;\n  height: 2em;\n  width: 2em;\n  background-color: #fafad2;\n}\n\n.cell_content {\n  position: relative;\n  height: 2em;\n  width: 2em;\n}\n\n.marker_row {\n  left: -3em;\n  width: 2em;\n  text-align: right;\n  top: 1em;\n  height: 1em;\n}\n\n.marker_col {\n  top: -2em;\n  left: 0;\n  width: 100%;\n  text-align: center;\n}\n\n.marker {\n  position: absolute;\n  font-size: 11px;\n  z-index: -1;\n}\n\n.game_play {\n  display: block;\n  position: absolute;\n  top: 10%;\n  left: 10%;\n}\n\n.game_play > .play_btn.inactive {\n  display: none;\n}\n\n.game_play > .play_btn {\n  padding: 0.5rem 1rem;\n  box-shadow: 0px 2px 5px -2px black;\n}\n\n.game_play > .play_btn:hover {\n  cursor: pointer;\n}\n\n@media screen and (min-width: 768px) {\n  #boards_container {\n    flex-direction: row;\n  }\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/api.js":
/*!*****************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/api.js ***!
  \*****************************************************/
/***/ ((module) => {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = [];

  // return the list of modules as css string
  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";
      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }
      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }
      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }
      content += cssWithMappingToString(item);
      if (needLayer) {
        content += "}";
      }
      if (item[2]) {
        content += "}";
      }
      if (item[4]) {
        content += "}";
      }
      return content;
    }).join("");
  };

  // import a list of modules into the list
  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }
    var alreadyImportedModules = {};
    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];
        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }
    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);
      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }
      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }
      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }
      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }
      list.push(item);
    }
  };
  return list;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/getUrl.js":
/*!********************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/getUrl.js ***!
  \********************************************************/
/***/ ((module) => {

"use strict";


module.exports = function (url, options) {
  if (!options) {
    options = {};
  }
  if (!url) {
    return url;
  }
  url = String(url.__esModule ? url.default : url);

  // If url is already wrapped in quotes, remove them
  if (/^['"].*['"]$/.test(url)) {
    url = url.slice(1, -1);
  }
  if (options.hash) {
    url += options.hash;
  }

  // Should url be wrapped?
  // See https://drafts.csswg.org/css-values-3/#urls
  if (/["'() \t\n]|(%20)/.test(url) || options.needQuotes) {
    return "\"".concat(url.replace(/"/g, '\\"').replace(/\n/g, "\\n"), "\"");
  }
  return url;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/sourceMaps.js":
/*!************************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/sourceMaps.js ***!
  \************************************************************/
/***/ ((module) => {

"use strict";


module.exports = function (item) {
  var content = item[1];
  var cssMapping = item[3];
  if (!cssMapping) {
    return content;
  }
  if (typeof btoa === "function") {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    return [content].concat([sourceMapping]).join("\n");
  }
  return [content].join("\n");
};

/***/ }),

/***/ "./src/app.css":
/*!*********************!*\
  !*** ./src/app.css ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_app_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./app.css */ "./node_modules/css-loader/dist/cjs.js!./src/app.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_app_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_app_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_app_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_app_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/styles/header.css":
/*!*******************************!*\
  !*** ./src/styles/header.css ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_header_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../node_modules/css-loader/dist/cjs.js!./header.css */ "./node_modules/css-loader/dist/cjs.js!./src/styles/header.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_header_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_header_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_header_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_header_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/styles/home.css":
/*!*****************************!*\
  !*** ./src/styles/home.css ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_home_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../node_modules/css-loader/dist/cjs.js!./home.css */ "./node_modules/css-loader/dist/cjs.js!./src/styles/home.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_home_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_home_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_home_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_home_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/styles/navbar.css":
/*!*******************************!*\
  !*** ./src/styles/navbar.css ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_navbar_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../node_modules/css-loader/dist/cjs.js!./navbar.css */ "./node_modules/css-loader/dist/cjs.js!./src/styles/navbar.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_navbar_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_navbar_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_navbar_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_navbar_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/styles/notifications.css":
/*!**************************************!*\
  !*** ./src/styles/notifications.css ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_notifications_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../node_modules/css-loader/dist/cjs.js!./notifications.css */ "./node_modules/css-loader/dist/cjs.js!./src/styles/notifications.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_notifications_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_notifications_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_notifications_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_notifications_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/styles/port.css":
/*!*****************************!*\
  !*** ./src/styles/port.css ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_port_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../node_modules/css-loader/dist/cjs.js!./port.css */ "./node_modules/css-loader/dist/cjs.js!./src/styles/port.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_port_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_port_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_port_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_port_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/styles/screenController.css":
/*!*****************************************!*\
  !*** ./src/styles/screenController.css ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_screenController_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../node_modules/css-loader/dist/cjs.js!./screenController.css */ "./node_modules/css-loader/dist/cjs.js!./src/styles/screenController.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_screenController_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_screenController_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_screenController_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_screenController_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module) => {

"use strict";


var stylesInDOM = [];
function getIndexByIdentifier(identifier) {
  var result = -1;
  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }
  return result;
}
function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };
    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }
    identifiers.push(identifier);
  }
  return identifiers;
}
function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);
  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }
      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };
  return updater;
}
module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];
    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }
    var newLastIdentifiers = modulesToDom(newList, options);
    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];
      var _index = getIndexByIdentifier(_identifier);
      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();
        stylesInDOM.splice(_index, 1);
      }
    }
    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertBySelector.js":
/*!********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertBySelector.js ***!
  \********************************************************************/
/***/ ((module) => {

"use strict";


var memo = {};

/* istanbul ignore next  */
function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target);

    // Special case to return head of iframe instead of iframe itself
    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }
    memo[target] = styleTarget;
  }
  return memo[target];
}

/* istanbul ignore next  */
function insertBySelector(insert, style) {
  var target = getTarget(insert);
  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }
  target.appendChild(style);
}
module.exports = insertBySelector;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertStyleElement.js":
/*!**********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertStyleElement.js ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}
module.exports = insertStyleElement;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js ***!
  \**********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;
  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}
module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleDomAPI.js":
/*!***************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleDomAPI.js ***!
  \***************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";
  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }
  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }
  var needLayer = typeof obj.layer !== "undefined";
  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }
  css += obj.css;
  if (needLayer) {
    css += "}";
  }
  if (obj.media) {
    css += "}";
  }
  if (obj.supports) {
    css += "}";
  }
  var sourceMap = obj.sourceMap;
  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  }

  // For old IE
  /* istanbul ignore if  */
  options.styleTagTransform(css, styleElement, options.options);
}
function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }
  styleElement.parentNode.removeChild(styleElement);
}

/* istanbul ignore next  */
function domAPI(options) {
  if (typeof document === "undefined") {
    return {
      update: function update() {},
      remove: function remove() {}
    };
  }
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}
module.exports = domAPI;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleTagTransform.js":
/*!*********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleTagTransform.js ***!
  \*********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }
    styleElement.appendChild(document.createTextNode(css));
  }
}
module.exports = styleTagTransform;

/***/ }),

/***/ "./src/app.js":
/*!********************!*\
  !*** ./src/app.js ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _iconfu_svg_inject__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @iconfu/svg-inject */ "./node_modules/@iconfu/svg-inject/dist/svg-inject.js");
/* harmony import */ var _iconfu_svg_inject__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_iconfu_svg_inject__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _components_header_header__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/header/header */ "./src/components/header/header.js");
/* harmony import */ var _components_main_main__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./components/main/main */ "./src/components/main/main.js");
/* harmony import */ var _app_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./app.css */ "./src/app.css");






(() => {
  const build = {
    header: _components_header_header__WEBPACK_IMPORTED_MODULE_2__["default"],
    main: _components_main_main__WEBPACK_IMPORTED_MODULE_3__["default"],
  };

  const app = {
    init() {
      this.render();
    },
    render() {
      const appWrapper = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      appWrapper.id = 'battleship_app';

      appWrapper.appendChild(build.header());
      appWrapper.appendChild(build.main());
      document.body.appendChild(appWrapper);
    },
  };

  app.init();
})();


/***/ }),

/***/ "./src/components/board/board.js":
/*!***************************************!*\
  !*** ./src/components/board/board.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../helpers/createElement */ "./src/helpers/createElement.js");



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((player, playerBoard) => {
  const board = {
    board: playerBoard,
    ships: [],
    player,
    init() {
      this.bindEvents();
    },
    bindEvents() {
      this.pushShip = this.pushShip.bind(this);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__["default"].subscribe(`pushShip_${this.player.substring(player.indexOf('_'))}`, this.pushShip);
    },
    render() {
      const playerBoard = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      playerBoard.classList.add('board');
      this.board.forEach((row, y) => {
        const boardRow = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
        boardRow.classList.add('board_row');
        row.forEach((cell, x) => {
          const cellBtn = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('button');
          cellBtn.setAttributes({
            class: 'cell',
            ['data-x']: x + 1,
            ['data-y']: row.length - y,
          });
          // Need to show only activePlayer's ships
          // Need to hide the opponent's ships when activePlayer changes
          const cellContent = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
          const cellContentSpace = document.createTextNode('\u00A0');
          const blankWrapper = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('span');
          blankWrapper.classList.add('blank_wrapper');
          cellContent.appendChild(blankWrapper);
          cellContent.appendChild(cellContentSpace);

          if (cell.ship) {
            cellBtn.classList.add('busy');
            // Problem, allows opponents to cheat in a browser developer tools
            const cellShip = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
            const findShip = this.ships.find((ship) => ship.id === cell.ship.id);
            if (findShip) {
              cellShip.style.cssText = findShip.style;
              this.ships.splice(this.ships.indexOf(findShip), 1);
              cellShip.classList.add('ship_box');
              cellContent.appendChild(cellShip);
            }
          }

          cellContent.classList.add('cell_content');
          cellBtn.appendChild(cellContent);
          // Need to check for left and top edges of board
          // To create row and column labels
          if (x === 0 || y === 0) {
            const rowMarker = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
            const colMarker = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
            if (x === 0) {
              rowMarker.setAttributes({ class: 'marker marker_row', textContent: `${y + 1}` });
              cellContent.appendChild(rowMarker);
            }

            if (y === 0) {
              colMarker.setAttributes({
                class: 'marker marker_col',
                textContent: `${String.fromCharCode(65 + x)}`,
              });
              cellContent.appendChild(colMarker);
            }
          }
          boardRow.appendChild(cellBtn);
        });
        playerBoard.appendChild(boardRow);
      });
      return playerBoard;
    },
    pushShip(shipData) {
      // Need to save ship info; CSS and ID
      const findShip = this.ships.find((ship) => ship.id === shipData.id);

      if (!findShip) {
        this.ships.push(shipData);
      } else {
        const index = this.ships.indexOf(findShip);
        this.ships[index] = shipData;
      }
    },
  };

  board.init();
  // return board.render(playerBoard);
  return board;
});


/***/ }),

/***/ "./src/components/header/header.config.js":
/*!************************************************!*\
  !*** ./src/components/header/header.config.js ***!
  \************************************************/
/***/ (() => {



/***/ }),

/***/ "./src/components/header/header.js":
/*!*****************************************!*\
  !*** ./src/components/header/header.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _header_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./header.config */ "./src/components/header/header.config.js");
/* harmony import */ var _header_config__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_header_config__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _navbar_navbar__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./navbar/navbar */ "./src/components/header/navbar/navbar.js");
/* harmony import */ var _notifications_notifications__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./notifications/notifications */ "./src/components/header/notifications/notifications.js");
/* harmony import */ var _styles_header_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../styles/header.css */ "./src/styles/header.css");






/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const header = {
    init() {},
    cacheDOM(element) {
      this.header = element;
    },
    bindEvents() {},
    render() {
      const headerElement = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('header');
      headerElement.id = 'header';
      headerElement.appendChild((0,_navbar_navbar__WEBPACK_IMPORTED_MODULE_2__["default"])());
      headerElement.appendChild((0,_notifications_notifications__WEBPACK_IMPORTED_MODULE_3__["default"])());
      this.cacheDOM(headerElement);

      return headerElement;
    },
  };

  return header.render();
});


/***/ }),

/***/ "./src/components/header/navbar/navbar.config.js":
/*!*******************************************************!*\
  !*** ./src/components/header/navbar/navbar.config.js ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _assets_icons_github_mark_github_mark_white_svg__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../assets/icons/github_mark/github-mark-white.svg */ "./src/assets/icons/github_mark/github-mark-white.svg");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ([
  {
    element: 'ul',
    attributes: {
      class: 'nav_left',
    },
    children: [
      {
        element: 'li',
        children: [
          {
            element: 'a',
            attributes: {
              href: '#',
              class: 'nav_item nav_logo',
            },
            children: [
              {
                element: 'img',
                attributes: {
                  src: '#',
                  // onload: 'SVGInject(this)',
                },
              },
              {
                element: 'h1',
                attributes: {
                  textContent: 'Battleship',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: 'ul',
    attributes: {
      class: 'nav_right',
    },
    children: [
      {
        element: 'li',
        children: [
          {
            element: 'a',
            attributes: {
              href: '#',
              class: 'nav_item',
              textContent: 'Placeholder',
            },
          },
        ],
      },
      {
        element: 'li',
        children: [
          {
            element: 'a',
            attributes: {
              href: '#',
              class: 'nav_item',
              textContent: 'Placeholder',
            },
          },
        ],
      },
      {
        element: 'li',
        children: [
          {
            element: 'a',
            attributes: {
              href: 'https://github.com/mikeyCos/battleship/tree/main',
              target: '_blank',
              class: 'nav_item github',
            },
            children: [
              {
                element: 'img',
                attributes: {
                  class: 'github_logo',
                  src: _assets_icons_github_mark_github_mark_white_svg__WEBPACK_IMPORTED_MODULE_0__,
                  onload: 'SVGInject(this)',
                },
              },
            ],
          },
        ],
      },
      {
        element: 'li',
        children: [
          {
            element: 'a',
            attributes: {
              href: 'index.html',
              target: '_self',
              class: 'nav_item leave_game inactive',
              textContent: 'Leave game',
            },
          },
        ],
      },
    ],
  },
]);


/***/ }),

/***/ "./src/components/header/navbar/navbar.js":
/*!************************************************!*\
  !*** ./src/components/header/navbar/navbar.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _navbar_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./navbar.config */ "./src/components/header/navbar/navbar.config.js");
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../containers/pubSub */ "./src/containers/pubSub.js");
/* harmony import */ var _styles_navbar_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../styles/navbar.css */ "./src/styles/navbar.css");





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const navbar = {
    init() {
      this.revealLeave = this.revealLeave.bind(this);
    },
    cacheDOM(element) {
      this.navbar = element;
      this.navLeave = element.querySelector('.nav_item.leave_game');
    },
    bindEvents() {
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('revealLeave', this.revealLeave);
    },
    render() {
      const navElement = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('nav');
      navElement.id = 'navbar';

      _navbar_config__WEBPACK_IMPORTED_MODULE_1__["default"].forEach((item) => {
        const navChild = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])(item.element);
        navChild.setAttributes(item.attributes);
        navChild.setChildren(item.children);
        navElement.appendChild(navChild);
      });

      this.cacheDOM(navElement);
      this.bindEvents();
      return navElement;
    },
    revealLeave(e) {
      this.navLeave.classList.remove('inactive');
    },
  };

  navbar.init();
  return navbar.render();
});


/***/ }),

/***/ "./src/components/header/notifications/notifications.config.js":
/*!*********************************************************************!*\
  !*** ./src/components/header/notifications/notifications.config.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   container: () => (/* binding */ container),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  element: 'div',
  attributes: {
    class: 'notification_message',
  },
  options: [
    {
      type: 'default',
      attributes: {
        textContent: 'Pick game mode',
      },
    },
    {
      type: 'place',
      attributes: {
        textContent: 'Place ships',
      },
    },
    {
      type: 'turn',
      createAttributes(text) {
        const player = text;
        this.attributes = { textContent: `Player ${player}'s turn.` };
      },
    },
    {
      type: 'gameover',
      createAttributes(text) {
        const player = text;
        this.attributes = { textContent: `Game over. Congratulations, player ${player} won!` };
      },
      sibling: [
        {
          element: 'a',
          attributes: {
            href: 'index.html',
            target: '_self',
            class: 'play_again',
            textContent: 'Play Again',
          },
        },
      ],
    },
  ],
});

const container = {
  element: 'div',
  attributes: {
    id: 'notifications_container',
  },
  children: [
    {
      element: 'div',
      attributes: {
        class: 'notification_wrapper',
      },
    },
  ],
};


/***/ }),

/***/ "./src/components/header/notifications/notifications.js":
/*!**************************************************************!*\
  !*** ./src/components/header/notifications/notifications.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../containers/pubSub */ "./src/containers/pubSub.js");
/* harmony import */ var _notifications_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./notifications.config */ "./src/components/header/notifications/notifications.config.js");
/* harmony import */ var _styles_notifications_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../styles/notifications.css */ "./src/styles/notifications.css");





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const notifications = {
    init() {
      this.render = this.render.bind(this);
    },
    cacheDOM(element) {
      this.notificationContainer = element;
    },
    bindEvents() {
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].subscribe('notify', this.render);
    },
    render(type, player) {
      const messageType = type ? type : 'default';
      const notificationContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])(_notifications_config__WEBPACK_IMPORTED_MODULE_2__.container.element);
      notificationContainer.setAttributes(_notifications_config__WEBPACK_IMPORTED_MODULE_2__.container.attributes);
      notificationContainer.setChildren(_notifications_config__WEBPACK_IMPORTED_MODULE_2__.container.children);
      const notificationWrapper = notificationContainer.firstChild;

      const message = _notifications_config__WEBPACK_IMPORTED_MODULE_2__["default"].options.find((message) => message.type === messageType);
      if (player) {
        message.createAttributes(player);
      }
      const notificationMessage = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])(_notifications_config__WEBPACK_IMPORTED_MODULE_2__["default"].element);
      notificationMessage.setAttributes({
        ..._notifications_config__WEBPACK_IMPORTED_MODULE_2__["default"].attributes,
        ...message.attributes,
      });
      notificationContainer.classList.add(message.type);
      notificationWrapper.appendChild(notificationMessage);

      if (type) {
        this.notificationContainer.replaceWith(notificationContainer);
        if (message.sibling) notificationWrapper.setChildren(message.sibling);
      }

      this.cacheDOM(notificationContainer);
      this.bindEvents();
      if (!player) return notificationContainer;
    },
  };

  notifications.init();
  return notifications.render();
});


/***/ }),

/***/ "./src/components/home/home.config.js":
/*!********************************************!*\
  !*** ./src/components/home/home.config.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ([
  {
    element: 'section',
    attributes: {
      class: 'gamemode_btns',
    },
    children: [
      {
        element: 'button',
        attributes: {
          class: 'gamemode_btn human_human',
        },
        children: [
          {
            element: 'span',
            attributes: {
              textContent: 'human vs human',
            },
          },
        ],
      },
      {
        element: 'button',
        attributes: {
          class: 'gamemode_btn human_computer',
        },
        children: [
          {
            element: 'span',
            attributes: {
              textContent: 'human vs computer',
            },
          },
        ],
      },
    ],
  },
]);


/***/ }),

/***/ "./src/components/home/home.js":
/*!*************************************!*\
  !*** ./src/components/home/home.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _home_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./home.config */ "./src/components/home/home.config.js");
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");
/* harmony import */ var _styles_home_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../styles/home.css */ "./src/styles/home.css");





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const home = {
    init() {},
    cacheDOM(element) {
      this.home = element;
      this.header = this.home.querySelector('h2');
      this.modeBtns = this.home.querySelectorAll('.gamemode_btn');
    },
    bindEvents() {
      this.setGameMode = this.setGameMode.bind(this);
      this.modeBtns.forEach((btn) => btn.addEventListener('click', this.setGameMode));
    },
    render() {
      const homeContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
      homeContainer.id = 'home';

      _home_config__WEBPACK_IMPORTED_MODULE_1__["default"].forEach((item) => {
        const homeChild = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])(item.element);
        if (item.attributes) homeChild.setAttributes(item.attributes);
        if (item.children) homeChild.setChildren(item.children);
        homeContainer.appendChild(homeChild);
      });

      this.cacheDOM(homeContainer);
      this.bindEvents();
      return homeContainer;
    },
    setGameMode(e) {
      const gamemode = !e.currentTarget.classList.value.includes('computer');
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('main_render', gamemode);
    },
  };

  return home.render();
});


/***/ }),

/***/ "./src/components/main/main.js":
/*!*************************************!*\
  !*** ./src/components/main/main.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _screen_screenController__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../screen/screenController */ "./src/components/screen/screenController.js");
/* harmony import */ var _home_home__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../home/home */ "./src/components/home/home.js");
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const build = {
    home: _home_home__WEBPACK_IMPORTED_MODULE_2__["default"],
    game: _screen_screenController__WEBPACK_IMPORTED_MODULE_1__["default"],
  };
  const main = {
    init() {
      this.render = this.render.bind(this);
    },
    cacheDOM(element) {
      this.main = element;
    },
    bindEvents() {
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_3__["default"].subscribe('main_render', this.render);
    },
    render(mode) {
      if (mode === undefined) {
        const mainContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
        mainContainer.id = 'main_content';
        mainContainer.appendChild(build.home());
        this.cacheDOM(mainContainer);
        this.bindEvents();
        return mainContainer;
      } else {
        this.main.firstElementChild.replaceWith(build.game(mode));
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_3__["default"].publish('revealLeave');
      }
    },
  };

  main.init();
  return main.render();
});


/***/ }),

/***/ "./src/components/port/port.config.js":
/*!********************************************!*\
  !*** ./src/components/port/port.config.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  element: 'div',
  attributes: {
    class: 'port',
  },
  children: [
    {
      element: 'p',
      attributes: {
        textContent: 'Drag the ships to the grid, and then click to rotate:',
      },
    },
    {
      element: 'div',
      attributes: {
        class: 'port_lines',
      },
      children: [
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 8em; height: 2em; padding-right: 6px; padding-bottom: 0px;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '4',
                ['data-orientation']: 'h',
                style: 'width: 8em; height: 2em; padding-right: 6px; padding-bottom: 0px;',
              },
            },
          ],
        },
      ],
    },
    {
      element: 'div',
      attributes: {
        class: 'port_lines',
      },
      children: [
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 6em; height: 2em; padding-right: 4px; padding-bottom: 0px;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '3',
                ['data-orientation']: 'h',
                style: 'width: 6em; height: 2em; padding-right: 4px; padding-bottom: 0px;',
              },
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 6em; height: 2em; padding-right: 4px; padding-bottom: 0px;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '3',
                ['data-orientation']: 'h',
                style: 'width: 6em; height: 2em; padding-right: 4px; padding-bottom: 0px;',
              },
            },
          ],
        },
      ],
    },
    {
      element: 'div',
      attributes: {
        class: 'port_lines',
      },
      children: [
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 4em; height: 2em; padding-right: 2px; padding-bottom: 0px;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '2',
                ['data-orientation']: 'h',
                style: 'width: 4em; height: 2em; padding-right: 2px; padding-bottom: 0px;',
              },
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 4em; height: 2em; padding-right: 2px; padding-bottom: 0px;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '2',
                ['data-orientation']: 'h',
                style: 'width: 4em; height: 2em; padding-right: 2px; padding-bottom: 0px;',
              },
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 4em; height: 2em; padding-right: 2px; padding-bottom: 0px;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '2',
                ['data-orientation']: 'h',
                style: 'width: 4em; height: 2em; padding-right: 2px; padding-bottom: 0px;',
              },
            },
          ],
        },
      ],
    },
    {
      element: 'div',
      attributes: {
        class: 'port_lines',
      },
      children: [
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 2em; height: 2em;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '1',
                ['data-orientation']: 'h',
                style: 'width: 2em; height: 2em;',
              },
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 2em; height: 2em;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '1',
                ['data-orientation']: 'h',
                style: 'width: 2em; height: 2em;',
              },
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 2em; height: 2em;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                // draggable: 'true',
                ['data-id']: '',
                ['data-length']: '1',
                ['data-orientation']: 'h',
                style: 'width: 2em; height: 2em;',
              },
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'port_ship',
            style: 'width: 2em; height: 2em;',
          },
          children: [
            {
              element: 'div',
              attributes: {
                class: 'ship_box',
                ['data-id']: '',
                ['data-length']: '1',
                ['data-orientation']: 'h',
                style: 'width: 2em; height: 2em;',
              },
            },
          ],
        },
      ],
    },
    {
      element: 'div',
      attributes: {
        class: 'btns_container',
      },
      children: [
        {
          element: 'div',
          attributes: {
            class: 'reset',
          },
          children: [
            {
              element: 'button',
              attributes: {
                class: 'reset_btn inactive',
              },
              children: [
                {
                  element: 'span',
                  attributes: {
                    textContent: 'Reset',
                  },
                },
              ],
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'random',
          },
          children: [
            {
              element: 'button',
              attributes: {
                class: 'randomize_btn',
              },
              children: [
                {
                  element: 'span',
                  attributes: {
                    textContent: 'Randomize',
                  },
                },
              ],
            },
          ],
        },
        {
          element: 'div',
          attributes: {
            class: 'ready',
          },
          children: [
            {
              element: 'button',
              attributes: {
                class: 'ready_btn inactive',
                ['data-ready']: false,
              },
              children: [
                {
                  element: 'span',
                  attributes: {
                    textContent: 'Ready',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});


/***/ }),

/***/ "./src/components/port/port.js":
/*!*************************************!*\
  !*** ./src/components/port/port.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _port_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./port.config */ "./src/components/port/port.config.js");
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");
/* harmony import */ var _board_board__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../board/board */ "./src/components/board/board.js");





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((player, game, mode, board) => {
  const port = {
    // Rename to portController or shipsController?
    player,
    game,
    mode,
    board,
    init() {
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.dragEndHandler = this.dragEndHandler.bind(this);
      this.dragMoveHandler = this.dragMoveHandler.bind(this);
      this.dropHandler = this.dropHandler.bind(this);
      this.rotateHandler = this.rotateHandler.bind(this);
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.resetHandler = this.resetHandler.bind(this);
      this.readyHandler = this.readyHandler.bind(this);
      this.randomizeHandler = this.randomizeHandler.bind(this);
      this.placeRandom = this.placeRandom.bind(this);

      this.playerBoard =
        player === 'player_one' ? this.game.playerOneBoard : this.game.playerTwoBoard;
      this.dropSubscriber = `drop${player.substring(player.indexOf('_'))}`;
      this.rotateSubscriber = `rotate${player.substring(player.indexOf('_'))}`;
      this.placeRandomSubscriber = `placeRandom${player.substring(player.indexOf('_'))}`;
    },
    cacheDOM(element) {
      this.port = element;
      this.ports = element.querySelectorAll('.port_ship');
      this.ships = element.querySelectorAll('.ship_box');
      this.resetBtn = element.querySelector('.reset_btn');
      this.readyBtn = element.querySelector('.ready_btn');
      this.randomizeBtn = element.querySelector('.randomize_btn');
    },
    bindEvents() {
      this.ships.forEach((ship) => {
        // https://stackoverflow.com/questions/40464690/want-to-perform-different-task-on-mousedown-and-click-event
        ship.addEventListener('mousedown', this.dragStartHandler);
      });

      this.resetBtn.addEventListener('click', this.resetHandler);
      this.readyBtn.addEventListener('click', this.readyHandler);
      this.randomizeBtn.addEventListener('click', this.randomizeHandler);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe(this.dropSubscriber, this.dropHandler);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe(this.rotateSubscriber, this.rotateHandler);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe(this.placeRandomSubscriber, this.placeRandom);
    },
    render() {
      const playerPort = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])(_port_config__WEBPACK_IMPORTED_MODULE_1__["default"].element);
      playerPort.setAttributes(_port_config__WEBPACK_IMPORTED_MODULE_1__["default"].attributes);
      playerPort.setChildren(_port_config__WEBPACK_IMPORTED_MODULE_1__["default"].children);
      this.cacheDOM(playerPort);
      if (!this.mode) this.readyBtn.classList.add('inactive');
      if (!this.mode && this.player === 'player_two') this.port.classList.add('inactive');
      this.bindEvents();
      return playerPort;
    },
    dragStartHandler(e) {
      this.draggable = e.currentTarget;
      this.dragStart = e.target.parentElement;
      this.dropPlaceholder = this.draggable.cloneNode();
      this.dropPlaceholder.classList.add('ship_box_placeholder');
      this.offSetX = e.clientX;
      this.offSetY = e.clientY;

      this.dragTimer = setTimeout(() => {
        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('mouseup', this.dragEndHandler);
        this.draggable.removeEventListener('click', this.rotateHandler);
      }, 250);

      this.draggable.addEventListener('click', this.rotateHandler, { once: true });
    },
    dragMoveHandler(e) {
      this.draggable.classList.add('dragging');
      this.dragStart.classList.add('dragstart');

      this.draggable.style.left = `${e.clientX - this.offSetX}px`;
      this.draggable.style.top = `${e.clientY - this.offSetY}px`;

      const { left, top, width } = this.draggable.getBoundingClientRect();
      const shipLength = parseInt(this.draggable.dataset.length);
      const offSet = (width / shipLength) * 0.5;

      const cell = document
        .elementsFromPoint(left + offSet, top + offSet)
        .find((element) => element.classList.contains('cell'));

      const board = document
        .elementsFromPoint(left + offSet, top + offSet)
        .find((element) => element.classList.contains('board'));
      const isPlayerShip = board ? board.parentElement.contains(this.port) : false;
      if (cell && isPlayerShip) {
        // Dragging over drop zone
        // If draggable is more than 50% over it's 'last' cell
        //  Append the draggable to the cell content container
        this.cell = cell;
        const x = parseInt(this.cell.dataset.x);
        const y = parseInt(this.cell.dataset.y);

        const id = this.draggable.dataset.id;
        const orientation = this.draggable.dataset.orientation !== 'h';

        this.playerBoard.placeShip(
          [x, y],
          shipLength,
          orientation,
          true,
          false,
          id,
          this.dropSubscriber,
          this.rotateSubscriber,
        );
      } else {
        // Dragging over a non drop zone
        if (
          this.draggable.classList.contains('ship_box_transparent') &&
          this.cell.firstChild.lastChild
        ) {
          this.cell.firstChild.lastChild.remove();
          this.cell = null;
          this.draggable.classList.remove('ship_box_transparent');
        }
      }
    },
    dragEndHandler(e) {
      this.draggable.style.left = `0px`;
      this.draggable.style.top = `0px`;

      this.draggable.classList.remove('dragging');
      this.draggable.classList.remove('ship_box_transparent');
      this.dragStart.classList.remove('dragstart');

      document.removeEventListener('mousemove', this.dragMoveHandler);
      document.removeEventListener('mouseup', this.dragEndHandler);
      if (this.cell) {
        // If user has stopped dragging over the drop zone
        const x = parseInt(this.cell.dataset.x);
        const y = parseInt(this.cell.dataset.y);
        const shipLength = parseInt(this.draggable.dataset.length);
        const id = this.draggable.dataset.id;
        const orientation = this.draggable.dataset.orientation !== 'h';

        this.playerBoard.placeShip(
          [x, y],
          shipLength,
          orientation,
          false,
          false,
          id,
          this.dropSubscriber,
          this.rotateSubscriber,
        );
      }

      if (!this.dragStart.classList.contains('port_ship') && this.draggable) {
        // If dragStart is not the port_ship element
      }
    },
    dropHandler(isDragging, isValidDrop) {
      if (this.cell) {
        const cellContent = this.cell.firstChild;
        if (isDragging && isValidDrop) {
          // If user is dragging over the drop zone
          cellContent.appendChild(this.dropPlaceholder);
          this.draggable.classList.add('ship_box_transparent');
        } else if (!isDragging && isValidDrop) {
          // If user has stopped dragging over the drop zone
          cellContent.appendChild(this.draggable);
          this.dropPlaceholder.remove();
          if (this.resetBtn.classList.contains('inactive')) {
            this.resetBtn.classList.remove('inactive');
          }

          if (this.isPortsEmpty() && !this.playerReady) {
            this.playerReady = true;
            if (!this.mode) _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('playerReady', this.player);
            if (this.mode) {
              this.readyBtn.click();
              this.readyBtn.classList.remove('inactive');
            }

            [...this.port.children].forEach((child) => {
              if (!child.classList.contains('btns_container')) {
                child.style.display = 'none';
              }
            });
          }

          _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish(`pushShip_${this.player}`, {
            ...this.draggable.dataset,
            style: this.draggable.style.cssText,
          });
        } else if (isDragging && !isValidDrop) {
          // If user is dragging over an invalid drop
          if (this.dropPlaceholder) {
            this.dropPlaceholder.remove();
            this.draggable.classList.remove('ship_box_transparent');
          }
        }
      }
    },
    rotateHandler(e) {
      const newOrientation = this.draggable.dataset.orientation === 'h';
      if (e instanceof MouseEvent) {
        clearTimeout(this.dragTimer);
        if (
          !this.draggable.classList.contains('dragging') &&
          !this.dragStart.classList.contains('port_ship')
        ) {
          // If ship is not being dragged and it is not in port
          e.preventDefault();
          this.cell = this.dragStart.parentElement;
          const x = parseInt(this.cell.dataset.x);
          const y = parseInt(this.cell.dataset.y);
          const shipLength = parseInt(this.draggable.dataset.length);
          const id = this.draggable.dataset.id;
          this.playerBoard.placeShip(
            [x, y],
            shipLength,
            newOrientation,
            false,
            true,
            id,
            this.dropSubscriber,
            this.rotateSubscriber,
          );
        }
        e.stopImmediatePropagation();
      } else if (e === true && parseInt(this.draggable.dataset.length) > 1) {
        this.draggable.dataset.orientation = newOrientation ? 'v' : 'h';
        const newWidth = newOrientation ? this.draggable.style.width : this.draggable.style.height;
        const newHeight = newOrientation ? this.draggable.style.height : this.draggable.style.width;
        const newPaddingRight = newOrientation
          ? this.draggable.style.paddingRight
          : this.draggable.style.paddingBottom;
        const newPaddingBottom = newOrientation
          ? this.draggable.style.paddingBottom
          : this.draggable.style.paddingRight;
        this.draggable.style.width = newOrientation ? newHeight : newWidth;
        this.draggable.style.height = newOrientation ? newWidth : newHeight;
        this.draggable.style.paddingRight = newOrientation ? newPaddingBottom : newPaddingRight;
        this.draggable.style.paddingBottom = newOrientation ? newPaddingRight : newPaddingBottom;
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish(`pushShip_${this.player}`, {
          ...this.draggable.dataset,
          style: this.draggable.style.cssText,
        });
      } else if (e === false) {
        this.draggable.classList.add('rotate_error');

        setTimeout(() => {
          this.draggable.classList.remove('rotate_error');
        }, 250);
      }
    },
    resetHandler(e) {
      // Clears board
      this.playerReady = false;
      const playerBoard = this.resetBtn.closest(
        this.resetBtn.closest('.player_one') ? '.player_one' : '.player_two',
      ).firstChild;

      this.playerBoard.clearBoard();
      this.port.replaceWith(this.render());
      playerBoard.replaceWith(this.board.render());
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('playerReady', this.player, false);
    },
    isPortsEmpty() {
      return [...this.ports].every((port) => port.firstChild === null);
    },
    readyHandler(e) {
      const isReady = e.currentTarget.dataset.ready !== 'true';
      e.currentTarget.textContent = isReady ? 'Unready' : 'Ready';
      e.currentTarget.dataset.ready = isReady;
      this.hideShips(isReady);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('playerReady', this.player, isReady);
    },
    randomizeHandler(e) {
      this.resetBtn.click();
      this.playerBoard.placeShipsRandom(this.player.substring(this.player.indexOf('_') + 1));
      if (this.mode) {
        // If human vs human
        this.readyBtn.classList.remove('inactive');
      }

      if (this.isPortsEmpty() && !this.playerReady) {
        [...this.port.children].forEach((child) => {
          if (!child.classList.contains('btns_container')) {
            child.style.display = 'none';
          }
        });
      }
      this.resetBtn.classList.remove('inactive');
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('playerReady', this.player);
    },
    hideShips(isReady) {
      this.ships.forEach((ship) => {
        const display = isReady ? 'none' : 'block';
        ship.style.display = display;
      });
    },
    getCellContent([x, y]) {
      // Find cell with dataset.x === x && dataset.y ===y
      return document.querySelector(
        `.${this.player} > * > * > .cell[data-x='${x}'][data-y='${y}'] > .cell_content`,
      );
    },
    getShipBox(shipLength) {
      return document.querySelector(
        `.${this.player} > .port > * > .port_ship > .ship_box[data-length='${shipLength}']`,
      );
    },
    placeRandom(shipData) {
      const cellContent = this.getCellContent(shipData.coordinates);
      const shipBox = this.getShipBox(shipData.length);
      const newOrientation = shipData.orientation ? 'v' : 'h';
      if (shipBox.dataset.orientation !== newOrientation) {
        shipBox.dataset.orientation = newOrientation;
        const newWidth = newOrientation ? shipBox.style.width : shipBox.style.height;
        const newHeight = newOrientation ? shipBox.style.height : shipBox.style.width;
        const newPaddingRight = newOrientation
          ? shipBox.style.paddingRight
          : shipBox.style.paddingBottom;
        const newPaddingBottom = newOrientation
          ? shipBox.style.paddingBottom
          : shipBox.style.paddingRight;
        shipBox.style.width = newOrientation ? newHeight : newWidth;
        shipBox.style.height = newOrientation ? newWidth : newHeight;
        shipBox.style.paddingRight = newOrientation ? newPaddingBottom : newPaddingRight;
        shipBox.style.paddingBottom = newOrientation ? newPaddingRight : newPaddingBottom;
      }

      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish(`pushShip_${this.player.substring(player.indexOf('_'))}`, {
        ...shipBox.dataset,
        style: shipBox.style.cssText,
      });
      cellContent.appendChild(shipBox);

      this.playerBoard.placeShip(
        shipData.coordinates,
        shipData.length,
        shipData.orientation,
        false,
        false,
        shipBox.dataset.id,
      );
    },
  };

  port.init();
  return port.render();
});


/***/ }),

/***/ "./src/components/screen/composeGame.js":
/*!**********************************************!*\
  !*** ./src/components/screen/composeGame.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((state) => ({
  playersReady: [],
  init() {
    console.log('init running from composeGame');
  },
  isGameReady(player, isReady) {
    if (this.mode) {
      // If human vs human
      const index = this.playersReady.indexOf(player);
      if (isReady) {
        if (index === -1) this.playersReady.push(player);
      } else if (index !== -1) {
        this.playersReady.splice(index, 1);
      }

      this.playBtn.classList.toggle('inactive', this.playersReady.length !== 2);
    } else {
      // If human vs computer
      if (isReady === undefined) {
        if (this.playerTwoContainer.classList.contains('inactive')) {
          this.playerTwoContainer.classList.remove('inactive');
        }
      } else {
        this.playerTwoContainer.classList.add('inactive');
      }
    }
  },
  play(e) {
    if (!this.mode) {
      this.game.playerTwo.board.placeShipsRandom('two');
    }
    this.gameReady = true;
    this.render();
    this.renderWait();
  },
}));


/***/ }),

/***/ "./src/components/screen/playGame.js":
/*!*******************************************!*\
  !*** ./src/components/screen/playGame.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((state) => ({
  init() {},
  unbindEvents() {
    this.playerOneBoard.removeEventListener('click', this.boardHandler);
    this.playerTwoBoard.removeEventListener('click', this.boardHandler);
  },
  getButton([x, y]) {
    // Find button on this.game.activePlayer's board
    // for which it's dataset.x === x and dataset.y === y
    const board = [
      ...(this.game.activePlayer === this.game.playerOne
        ? this.playerTwoBoard
        : this.playerOneBoard
      ).children,
    ].flatMap((row) => [...row.children]);
    return board.find((btn) => btn.dataset.x == x && btn.dataset.y == y);
  },
  renderAttack(cell, coordinates) {
    const isArray = coordinates.every((item) => Array.isArray(item));

    if (isArray) {
      coordinates.forEach((coordinate) => {
        const button = this.getButton(coordinate);
        console.log(button);
        button.classList.add('done');
      });
    } else {
      const button = this.getButton(coordinates);
      button.classList.add(cell.miss ? 'miss' : 'hit');
    }
  },
  renderWait() {
    let player = 'one';
    if (this.game.activePlayer === this.game.playerOne) {
      // If game.activePlayer is NOT playerOne
      // Put 'wait' class on the player one's container
      this.playerOneHeader.textContent = `Your grid`;
      this.playerTwoHeader.textContent = `Opponent's grid`;
      this.playerOneContainer.classList.add('wait');
      this.playerTwoContainer.classList.remove('wait');
      this.playerOneBoard.removeEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    } else {
      this.playerOneHeader.textContent = `Opponent's grid`;
      this.playerTwoHeader.textContent = `Your grid`;
      this.playerTwoContainer.classList.add('wait');
      this.playerOneContainer.classList.remove('wait');
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.removeEventListener('click', this.boardHandler);
      player = 'two';
    }

    _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__["default"].publish('notify', 'turn', player);

    if (!this.mode && this.game.activePlayer === this.game.playerTwo) {
      // Optional, put a setTimeout()
      this.game.playRound();
    }
  },
  endGame(player) {
    this.unbindEvents();
    _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__["default"].publish('notify', 'gameover', player);
  },
  boardHandler(e) {
    const btn = e.target.parentElement;
    const x = parseInt(btn.dataset.x);
    const y = parseInt(btn.dataset.y);
    if (!isNaN(x) || !isNaN(y)) {
      const cell = this.game.activePlayer.opponentBoard.getBoardCell([x, y]);
      if (cell.miss === false || cell.hit === false) {
        this.game.playRound([x, y]);
      }
    }
  },
}));


/***/ }),

/***/ "./src/components/screen/screenController.js":
/*!***************************************************!*\
  !*** ./src/components/screen/screenController.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _containers_gameController__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../containers/gameController */ "./src/containers/gameController.js");
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../helpers/createElement */ "./src/helpers/createElement.js");
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");
/* harmony import */ var _composeGame__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./composeGame */ "./src/components/screen/composeGame.js");
/* harmony import */ var _playGame__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./playGame */ "./src/components/screen/playGame.js");
/* harmony import */ var _port_port__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../port/port */ "./src/components/port/port.js");
/* harmony import */ var _board_board__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../board/board */ "./src/components/board/board.js");
/* harmony import */ var _styles_screenController_css__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../styles/screenController.css */ "./src/styles/screenController.css");
/* harmony import */ var _styles_port_css__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../styles/port.css */ "./src/styles/port.css");










// Trying to decide whether or not it is a good idea to create a separate module
// to control the screen after players have placed all their ships
// and after a 'start' button is clicked
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mode) => {
  // Builds empty board for players to place their ships
  // mode === true => human vs human
  // mode === false => human vs computer

  const screenController = {
    mode,
    gameReady: false,
    game: (0,_containers_gameController__WEBPACK_IMPORTED_MODULE_0__["default"])(mode),
    init() {
      this.boards = {
        playerOne: (0,_board_board__WEBPACK_IMPORTED_MODULE_6__["default"])('player_one', this.game.playerOneBoard.board),
        playerTwo: (0,_board_board__WEBPACK_IMPORTED_MODULE_6__["default"])('player_two', this.game.playerTwoBoard.board),
      };
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('notify', 'place');
      this.updateGameState(_composeGame__WEBPACK_IMPORTED_MODULE_3__["default"]);
      this.play = this.play.bind(this);
      this.isGameReady = this.isGameReady.bind(this);
    },
    updateGameState(callback) {
      Object.assign(this, callback());
    },
    cacheDOM(element) {
      this.gameContainer = element;
      this.boardContainer = element.querySelector('#boards_container');
      this.playerOneContainer = element.querySelector('.player_one');
      this.playerTwoContainer = element.querySelector('.player_two');
      this.playerOneBoard = element.querySelector('.player_one > .board');
      this.playerTwoBoard = element.querySelector('.player_two > .board');
      this.playerOneHeader = element.querySelector('.player_one > h4');
      this.playerTwoHeader = element.querySelector('.player_two > h4');
      this.playBtn = element.querySelector('.play_btn');
    },
    bindEvents() {
      if (!this.gameReady) {
        // if (!this.mode) {
        this.playBtn.addEventListener('click', this.play);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('playerReady', this.isGameReady);
        // }
      }

      if (this.gameReady) {
        this.updateGameState(_playGame__WEBPACK_IMPORTED_MODULE_4__["default"]);
        this.renderAttack = this.renderAttack.bind(this);
        this.endGame = this.endGame.bind(this);
        this.renderWait = this.renderWait.bind(this);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('renderAttack', this.renderAttack);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('endgame', this.endGame);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('renderWait', this.renderWait);
        this.boardHandler = this.boardHandler.bind(this);
      }
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    },
    render() {
      const gameContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('section');
      const boardsContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerOneContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerTwoContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerOneHeader = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('h4');
      const playerTwoHeader = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('h4');
      const gamePlayContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const gamePlayBtn = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('button');
      const gamePlayBtnText = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('span');
      gamePlayBtnText.textContent = 'Play';
      gameContainer.id = 'game_container';
      boardsContainer.id = 'boards_container';
      playerOneContainer.classList.add('player_one');
      playerTwoContainer.classList.add('player_two');
      playerOneHeader.textContent = `Player one's grid`;
      playerTwoHeader.textContent = `Player two's grid`;
      gamePlayContainer.classList.add('game_play');
      gamePlayBtn.classList.add('play_btn');
      // Renders players' boards
      // playerOneContainer.appendChild(board('player_one', this.boards.playerOne));
      // playerTwoContainer.appendChild(board('player_two', this.boards.playerTwo));
      playerOneContainer.appendChild(this.boards.playerOne.render());
      playerTwoContainer.appendChild(this.boards.playerTwo.render());
      playerOneContainer.appendChild(playerOneHeader);
      playerTwoContainer.appendChild(playerTwoHeader);
      boardsContainer.appendChild(playerOneContainer);
      boardsContainer.appendChild(playerTwoContainer);
      gamePlayBtn.appendChild(gamePlayBtnText);
      gamePlayContainer.appendChild(gamePlayBtn);
      if (!this.gameReady) {
        playerOneContainer.appendChild(
          (0,_port_port__WEBPACK_IMPORTED_MODULE_5__["default"])('player_one', this.game, this.mode, this.boards.playerOne),
        );
        playerTwoContainer.appendChild(
          (0,_port_port__WEBPACK_IMPORTED_MODULE_5__["default"])('player_two', this.game, this.mode, this.boards.playerTwo),
        );
        if (this.mode) {
          gamePlayBtn.classList.add('inactive');
        } else {
          playerTwoContainer.classList.add('inactive');
          playerTwoContainer.classList.add('wait');
        }
        playerTwoContainer.appendChild(gamePlayContainer);
      }

      gameContainer.appendChild(boardsContainer);
      if (this.gameReady) {
        this.gameContainer.replaceWith(gameContainer);
        boardsContainer.classList.add('busy');
      }
      this.cacheDOM(gameContainer);
      this.bindEvents();
      if (!this.gameReady) return gameContainer;
    },
  };
  screenController.init();
  return screenController.render();
});


/***/ }),

/***/ "./src/containers/gameController.js":
/*!******************************************!*\
  !*** ./src/containers/gameController.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _gameboard__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./gameboard */ "./src/containers/gameboard.js");
/* harmony import */ var _player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player */ "./src/containers/player.js");
/* harmony import */ var _pipe__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pipe */ "./src/containers/pipe.js");
/* harmony import */ var _isHuman__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./isHuman */ "./src/containers/isHuman.js");
/* harmony import */ var _isComputer__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./isComputer */ "./src/containers/isComputer.js");
/* harmony import */ var _pubSub__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./pubSub */ "./src/containers/pubSub.js");






// Module that controls the main game loop
// For now just populate each Gameboard with predetermined coordinates.
// You are going to implement a system for allowing players to place their ships later.
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mode) => {
  // If mode is true player two will be a human, else a computer
  // The game loop should set up a new game by creating Players and Gameboards.
  // 1. Create gameboards
  // 2. Create players and pass in their gameboard and the opponent's gameboard.
  //  Do I only need to pass the opponent's board?
  // let activePlayer;
  const playerOneBoard = (0,_gameboard__WEBPACK_IMPORTED_MODULE_0__["default"])();
  const playerTwoBoard = (0,_gameboard__WEBPACK_IMPORTED_MODULE_0__["default"])();

  const playerOne = (0,_pipe__WEBPACK_IMPORTED_MODULE_2__["default"])(_player__WEBPACK_IMPORTED_MODULE_1__["default"], _isHuman__WEBPACK_IMPORTED_MODULE_3__["default"])(playerOneBoard, playerTwoBoard);
  const playerTwo = (0,_pipe__WEBPACK_IMPORTED_MODULE_2__["default"])(_player__WEBPACK_IMPORTED_MODULE_1__["default"], mode ? _isHuman__WEBPACK_IMPORTED_MODULE_3__["default"] : _isComputer__WEBPACK_IMPORTED_MODULE_4__["default"])(playerTwoBoard, playerOneBoard);

  const players = [playerOne, playerTwo];
  let activePlayer = players[Math.floor(Math.random() * 2)];

  const switchPlayers = (player) => {
    if (player) {
      // Looking into Lodash _.isEqual()
      // Could add a turn property to player object that takes a boolean
      activePlayer = player === playerOne ? playerTwo : playerOne;
    }
  };

  const playRound = (coordinate) => {
    // Allow a player to attack again if the initial attack hits a ship
    activePlayer.attack(coordinate);

    const status = getGameStatus();
    if (!status.status) {
      // If game is not over, switch players
      switchPlayers(activePlayer);
      _pubSub__WEBPACK_IMPORTED_MODULE_5__["default"].publish('renderWait');
    } else {
      _pubSub__WEBPACK_IMPORTED_MODULE_5__["default"].publish('endgame', status.player);
    }
  };

  const getGameStatus = () => {
    const status = { status: playerOneBoard.getStatus() || playerTwoBoard.getStatus() };
    if (status.status) {
      // Game is over
      const player = playerOneBoard.getStatus() ? 'two' : 'one';
      Object.assign(status, { player });
    }
    return status;
  };

  return {
    switchPlayers,
    playRound,
    getGameStatus,
    get activePlayer() {
      return activePlayer;
    },
    get playerOne() {
      return playerOne;
    },
    get playerTwo() {
      return playerTwo;
    },
    get playerOneBoard() {
      return playerOneBoard;
    },
    get playerTwoBoard() {
      return playerTwoBoard;
    },
  };
});


/***/ }),

/***/ "./src/containers/gameboard.js":
/*!*************************************!*\
  !*** ./src/containers/gameboard.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _containers_ship__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../containers/ship */ "./src/containers/ship.js");
/* harmony import */ var _pubSub__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pubSub */ "./src/containers/pubSub.js");
/* harmony import */ var _helpers_generateUUID__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../helpers/generateUUID */ "./src/helpers/generateUUID.js");




/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  // Keep track of missed attacks so they can display them properly.
  // Be able to report whether or not all of their ships have been sunk.
  // The memo array stores a Cell's references that resemble where ships have been placed.
  // The memo array is used in the methods clearBoard and placeShip
  const memo = [];
  const Cell = (ship) => {
    return ship
      ? {
          ship,
          hit: false,
          attack() {
            this.hit = true;
            this.ship.hit();
          },
        }
      : {
          miss: false,
          attack() {
            this.miss = true;
          },
        };
  };
  const board = new Array(10).fill().map(() => new Array(10).fill().map(() => Cell()));

  const clearBoard = () => {
    for (let i = 0; i < memo.length; i += 1) {
      const { row, col } = memo[i];
      board[row][col] = Cell();
      memo.splice(i, 1);
      i -= 1;
    }
  };

  const parseCoordinate = ([x, y]) => {
    // Parses coordinate inputted by user such that
    // the value pairs can be used for accessing elements
    // in the two dimensional array
    return [board.length - y, x - 1];
  };

  const unparseCoordinate = ([x, y]) => {
    return [y + 1, board.length - x];
  };

  const generateRandomCoordinate = () => {
    // Returns random coordinate with values between 1 and 10
    const coordinate = [];
    for (let i = 0; i < 2; i += 1) {
      coordinate.push(Math.floor(Math.random() * 10 + 1));
    }
    return coordinate;
  };

  const generateShipCoordinates = ([x, y], orientation, shipLength) => {
    const coordinates = [];

    if (orientation) {
      // Vertical
      for (let i = x; i < x + shipLength; i += 1) {
        coordinates.push([i, y]);
      }
    } else {
      // Horizontal
      for (let i = y; i < y + shipLength; i += 1) {
        coordinates.push([x, i]);
      }
    }

    return coordinates;
  };

  const validateCoordinate = (x, y) => {
    return x >= 0 && x < 10 && y >= 0 && y < 10;
  };

  const checkBoard = ([x, y], id) => {
    // Check if there is a ship at x and y
    // Check if all surrounding coordinates are undefined
    // Return true if ship can be place
    const boolean = validateCoordinate(x, y);
    const check = [
      [x, y],
      [x, y + 1],
      [x, y - 1],
      [x + 1, y],
      [x + 1, y + 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x - 1, y + 1],
      [x - 1, y - 1],
    ];
    return check.every(([a, b]) => {
      // Need to check if a and b are within the board's size
      // The value of a and b can only be between from 0 to 9.
      // It is pointless to check if there is space when a ship is placed at the border of the board
      return validateCoordinate(a, b)
        ? boolean && (board[a][b].ship === undefined || board[a][b].ship.id === id)
        : boolean;
    });
  };

  const placeShip = (
    coordinates,
    shipLength,
    orientation,
    isDragging,
    isRotating,
    id,
    dropSubscriber,
    rotateSubscriber,
  ) => {
    // How many parameters is too much?

    const [x, y] = parseCoordinate(coordinates);
    const shipCoordinates = generateShipCoordinates([x, y], orientation, shipLength);
    const isValidCoordinates = shipCoordinates.every((coordinate) => {
      return checkBoard(coordinate, id);
    });

    if (isValidCoordinates && !isDragging) {
      const newShip = (0,_containers_ship__WEBPACK_IMPORTED_MODULE_0__["default"])(shipLength, id);
      // Check if x and y are within the board's size
      // Check if there is a ship at x and y
      const isShipOnBoard = memo.some((cell) => cell.id === id && id !== undefined);
      if (isShipOnBoard) {
        for (let i = 0; i < memo.length; i += 1) {
          if (memo[i].id === id) {
            const { row, col } = memo[i];
            board[row][col] = Cell();
            memo.splice(i, 1);
            i -= 1;
          }
        }
      }

      if (orientation) {
        // Vertical
        for (let i = x; i < x + newShip.length; i += 1) {
          board[i][y] = Cell(newShip);
          memo.push({ row: i, col: y, id });
        }
      } else {
        // Horizontal
        for (let i = y; i < y + newShip.length; i += 1) {
          board[x][i] = Cell(newShip);
          memo.push({ row: x, col: i, id });
        }
      }

      if (isRotating) {
        _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish(rotateSubscriber, true);
      } else {
        _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish(dropSubscriber, false, true);
      }
    } else if (isValidCoordinates && isDragging && !isRotating) {
      // Draggable still dragging and valid placement
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish(dropSubscriber, true, true);
    } else if (!isValidCoordinates && isDragging && !isRotating) {
      // Draggable still dragging and invalid placement
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish(dropSubscriber, true, false);
    } else if (!isValidCoordinates && !isDragging && isRotating) {
      // Draggable is not dragging, invalid placement, and fails to rotate
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish(rotateSubscriber, false);
    }
  };

  const placeShipsRandom = (player) => {
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    const coordinates = [];
    let i = 0;

    while (i < ships.length) {
      const [x, y] = generateRandomCoordinate();
      const [parsedX, parsedY] = parseCoordinate([x, y]);
      const orientation = Math.floor(Math.random() * 2) === 1;
      const length = ships[i];
      const shipCoordinates = generateShipCoordinates([parsedX, parsedY], orientation, length);
      const isValidCoordinate = shipCoordinates.every(checkBoard);
      if (!coordinates.find(([a, b]) => a === x && b === y) && isValidCoordinate) {
        // placeShip([x, y], length, orientation, false, false, generateUUID());
        _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish(`placeRandom_${player}`, {
          coordinates: [x, y],
          length: length,
          orientation,
        });
        coordinates.push([x, y]);
        i += 1;
      }
    }
  };

  const shots = [];
  const validateAttack = (x, y) => {
    // Checks if coordinate is with the board size and has not been attacked
    const [a, b] = parseCoordinate([x, y]);
    return !shots.find(([a, b]) => a === x && b === y) && validateCoordinate(a, b);
  };

  const receiveAttack = ([x, y]) => {
    // Have a receiveAttack function that takes a pair of coordinates
    // Determines whether or not the attack hit a ship
    // Then sends the ‘hit’ function to the correct ship, or records the coordinates of the missed shot.
    const cell = getBoardCell([x, y]);
    const isValidAttack = validateAttack(x, y);

    if (isValidAttack) {
      cell.attack();
      shots.push([x, y]);
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('renderAttack', cell, [x, y]);
      const ship = cell.ship;
      if (ship && ship.isSunk()) {
        // Need to find all coordinates for the ship
        // const shipCoordinates = memo.filter((shipMemo) => shipMemo.id === ship.id);
        const shipCoordinates = memo.reduce((accumulator, current) => {
          if (current.id === ship.id) {
            accumulator.push(unparseCoordinate([current.row, current.col]));
          }
          return accumulator;
        }, []);
        _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('renderAttack', cell, shipCoordinates);
      }
    }
  };

  const getStatus = () => {
    // Reports whether or not all of their ships have been sunk.
    const flatBoard = board.flat().filter((cell) => cell.ship !== undefined);
    return flatBoard.every((cell) => cell.ship.isSunk());
  };

  const getBoardCell = ([x, y]) => {
    const [a, b] = parseCoordinate([x, y]);
    return board[a][b];
  };

  return {
    receiveAttack,
    placeShip,
    placeShipsRandom,
    getStatus,
    getBoardCell,
    clearBoard,
    get board() {
      return board;
    },
  };
});


/***/ }),

/***/ "./src/containers/isComputer.js":
/*!**************************************!*\
  !*** ./src/containers/isComputer.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((player) => {
  // Make the ‘computer’ capable of making random plays.
  // The AI does not have to be smart,
  // But it should know whether or not a given move is legal
  // (i.e. it shouldn’t shoot the same coordinate twice).

  const shots = [];
  const generateRandomCoordinate = () => {
    // Returns random coordinate with values between 1 and 10
    const coordinate = [];
    for (let i = 0; i < 2; i += 1) {
      coordinate.push(Math.floor(Math.random() * 10 + 1));
    }
    return coordinate;
  };

  const attack = () => {
    // Returns a random unique coordinate that is in-bounds of the board
    // Note, if shots.length is 100, game will be over
    // There are only 100 coordinates to attack
    while (shots.length < 100) {
      let [x, y] = generateRandomCoordinate();
      if (!shots.find(([a, b]) => a === x && b === y)) {
        player.opponentBoard.receiveAttack([x, y]);
        shots.push([x, y]);
        return [x, y];
      }
    }
  };

  return { attack };
});


/***/ }),

/***/ "./src/containers/isHuman.js":
/*!***********************************!*\
  !*** ./src/containers/isHuman.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((player) => ({
  attack: ([x, y]) => {
    player.opponentBoard.receiveAttack([x, y]);
    return [x, y];
  },
}));


/***/ }),

/***/ "./src/containers/pipe.js":
/*!********************************!*\
  !*** ./src/containers/pipe.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Articles about loosely coupling object inheritance with factory functions and pipe
// https://medium.com/dailyjs/building-and-composing-factory-functions-50fe90141374
// https://www.freecodecamp.org/news/pipe-and-compose-in-javascript-5b04004ac937/
// Observation: if there is no initial value, the first function does not run
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((initialFn, ...fns) =>
  (...values) => {
    return fns.reduce((obj, fn) => {
      return Object.assign(obj, fn(obj));
    }, initialFn(values));
  });


/***/ }),

/***/ "./src/containers/player.js":
/*!**********************************!*\
  !*** ./src/containers/player.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Players can take turns playing the game by attacking the enemy Gameboard.
// The game is played against the computer,

// Does each player have their own gameboard?
// Does each player have access to the opponent's gameboard?
// How to decide if game is player vs player and player vs computer?
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (([playerBoard, opponentBoard]) => {
  // const board = playerBoard;
  // Do I need to declare the const variable?
  const state = {
    get opponentBoard() {
      return opponentBoard;
    },
    get board() {
      return playerBoard;
    },
  };

  return state;
});

/*
const pipe = (initialFn, ...fns) => {
  return fns.reduce((obj, fn) => {
    return Object.assign(obj, fn(obj));
  }, initialFn());
};

const Animal = () => {
  let weight;

  const state = {
    weight,
    info: () => ({
      weight: state.weight,
      legs: state.legs,
    }),
  };
  return state;
};

const Cat = (state) => ({
  type: 'cat',
  legs: 4,
  speak: () => `meow, I have ${state.legs} legs`,
  poop: () => `meow...I am pooping.`,
  poopAgain: () => `${state.poop()} meow meow...I am pooping once more`,
});

const Bird = (state) => ({
  type: 'bird',
  legs: 2,
  speak: () => `chirp...chirp, I have ${state.legs} legs`,
  poop: () => `chirp...I am pooping.`,
  poopAgain: () => `${state.poop()} chirp chirp...I am pooping once more`,
});

const Wizard = (state) => ({
  fireball: () => `${state.type} is casting fireball`,
});

const Necromancer = (state) => ({
  defileDead: () => `${state.type} is casting defile dead`,
});

const cat = pipe(Animal, Cat, Wizard);
const bird = pipe(Animal, Bird, Necromancer);
console.log(cat.fireball());
console.log(cat.speak());
console.log(cat.info());
cat.weight = 10;
console.log(cat.info());
console.log(bird.defileDead());
console.log(bird.speak());
console.log(bird.info());
bird.weight = 3;
console.log(bird.info());
*/


/***/ }),

/***/ "./src/containers/pubSub.js":
/*!**********************************!*\
  !*** ./src/containers/pubSub.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  subscribers: {},
  subscribe(subscriber, fn) {
    // When would you want to subscribe a single function in the same subscriber more than once?
    this.subscribers[subscriber] = this.subscribers[subscriber] || [];
    if (!this.subscribers[subscriber].find((handler) => handler.name === fn.name)) {
      this.subscribers[subscriber].push(fn);
    }
  },
  unsubscribe(subscriber, fn) {
    if (this.subscribers[subscriber]) {
      this.subscribers[subscriber].splice(this.subscribers[subscriber].indexOf(fn), 1);
      if (this.subscribers[subscriber].length === 0) delete this.subscribers[subscriber];
    }
  },
  publish(subscriber, ...args) {
    if (this.subscribers[subscriber]) {
      this.subscribers[subscriber].forEach((fn) => fn(...args));
    }
  },
});


/***/ }),

/***/ "./src/containers/ship.js":
/*!********************************!*\
  !*** ./src/containers/ship.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((shipLength, shipID) => {
  // Properties:
  //  Length
  //  Numbers of times hit
  //  Sunk (true/false)
  // Methods:
  //  Hit, increases the number of ‘hits’ in your ship.
  //  isSunk() calculates whether a ship is considered sunk
  //    Based on its length and the number of hits it has received.
  // - Carrier	    5
  // - Battleship	  4
  // - Destroyer	  3
  // - Submarine	  3
  // - Patrol Boat	2
  // const length = size;
  // How or when to initialize a ship's length
  // What determines a ships length?
  const length = shipLength;
  const id = shipID;
  let numHits = 0;
  let sunk = false;
  const hit = () => {
    if (!sunk) numHits += 1;
  };
  const isSunk = () => {
    sunk = numHits === length;
    return sunk;
  };

  return {
    hit,
    isSunk,
    get length() {
      return length;
    },
    get id() {
      return id;
    },
  };
});


/***/ }),

/***/ "./src/helpers/createElement.js":
/*!**************************************!*\
  !*** ./src/helpers/createElement.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ createElement)
/* harmony export */ });
/* harmony import */ var _generateUUID__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./generateUUID */ "./src/helpers/generateUUID.js");


const BuildElement = (state) => ({
  setAttributes: (attributes) => {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'textContent') {
        if (key === 'class') {
          state.setClassName(value.split(/\s/));
        } else if (key === 'style') {
          state.setStyle(value);
        } else if (key === 'data-id') {
          state.setAttribute(key, (0,_generateUUID__WEBPACK_IMPORTED_MODULE_0__["default"])());
        } else {
          state.setAttribute(key, value);
        }
      } else {
        state.setTextContent(value);
      }
    });
  },
  setStyle: (text) => {
    state.style.cssText = text;
  },
  setID: (id) => {
    state.id = id;
  },
  setClassName: (arrClass) => {
    arrClass.forEach((className) => state.classList.add(className));
  },
  setTextContent: (text) => {
    state.textContent = text;
  },
  setChildren: (children) => {
    children.forEach((child) => {
      const childElement = createElement(child.element);
      if (child.attributes && child.attributes.constructor.name === 'Object') {
        childElement.setAttributes(child.attributes);
      }
      if (child.children) {
        // What if child of child.children has children?
        childElement.setChildren(child.children);
      }
      state.appendChild(childElement);
    });
  },
});

function createElement(tag) {
  const htmlElement = document.createElement(tag);

  return Object.assign(htmlElement, BuildElement(htmlElement));
}


/***/ }),

/***/ "./src/helpers/generateUUID.js":
/*!*************************************!*\
  !*** ./src/helpers/generateUUID.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  // Returns the first 6 characters from crypto.randomUUID()
  // Pseudo-randomly changes a lowercase letter to uppercase
  const uuid = crypto.randomUUID();
  return [...uuid.substring(0, uuid.indexOf('-'))].reduce((word, currentChar) => {
    const check = Math.floor(Math.random() * 2);
    if (check == false && currentChar.match(/[a-z]/)) {
      return word + currentChar.toUpperCase();
    }
    return word + currentChar;
  });
});

/*
Optional way not using Array.prototype.reduce()
const generateUUID = () => {
  const uuid = crypto.randomUUID();
    return [...uuid.substring(0, uuid.indexOf('-'))].map((char) => {
      const check = Math.floor(Math.random() * 2);
      if (check == false && char.match(/[a-z]/)) {
        return char.toUpperCase();
      }
      return char;
    }).join('');
};
*/


/***/ }),

/***/ "./src/assets/fonts/Roboto_Condensed/static/RobotoCondensed-Medium.ttf":
/*!*****************************************************************************!*\
  !*** ./src/assets/fonts/Roboto_Condensed/static/RobotoCondensed-Medium.ttf ***!
  \*****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "ff190f979bb05ae7bee6.ttf";

/***/ }),

/***/ "./src/assets/icons/github_mark/github-mark-white.svg":
/*!************************************************************!*\
  !*** ./src/assets/icons/github_mark/github-mark-white.svg ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "3b5bbb15a4baead82746.svg";

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__("./src/app.js"));
/******/ }
]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsbUJBQW1CO0FBQzVFOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsa0JBQWtCO0FBQ2pDLGVBQWUsUUFBUTtBQUN2QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVB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QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTyxrR0FBa0csVUFBVSxVQUFVLFlBQVksYUFBYSxXQUFXLFVBQVUsWUFBWSxPQUFPLEtBQUssWUFBWSxPQUFPLEtBQUssVUFBVSxZQUFZLE9BQU8sS0FBSyxVQUFVLFlBQVksT0FBTyxLQUFLLFVBQVUsTUFBTSxLQUFLLFlBQVksT0FBTyxLQUFLLFlBQVksYUFBYSxhQUFhLFdBQVcsVUFBVSxVQUFVLFVBQVUsVUFBVSxVQUFVLFVBQVUsVUFBVSxVQUFVLFVBQVUsTUFBTSxLQUFLLFVBQVUsTUFBTSxLQUFLLFlBQVksT0FBTyxLQUFLLFlBQVksV0FBVyxNQUFNLE1BQU0sVUFBVSxZQUFZLFdBQVcsT0FBTyxLQUFLLFVBQVUsVUFBVSxVQUFVLFVBQVUsVUFBVSxPQUFPLEtBQUssVUFBVSxVQUFVLFVBQVUsVUFB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL0BpY29uZnUvc3ZnLWluamVjdC9kaXN0L3N2Zy1pbmplY3QuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9hcHAuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL2hlYWRlci5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaG9tZS5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbmF2YmFyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9ub3RpZmljYXRpb25zLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9wb3J0LmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9hcHAuY3NzP2E2NzIiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaGVhZGVyLmNzcz9lNjhiIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL2hvbWUuY3NzPzRiNTEiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbmF2YmFyLmNzcz9jMWRiIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzPzJkMmQiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvcG9ydC5jc3M/MzRlZiIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcz8zNDFlIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9hcHAuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2JvYXJkL2JvYXJkLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9oZWFkZXIvaGVhZGVyLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL2hlYWRlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25hdmJhci9uYXZiYXIuY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9oZWFkZXIvbmF2YmFyL25hdmJhci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9ucy5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvbWFpbi9tYWluLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9wb3J0L3BvcnQuY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9wb3J0L3BvcnQuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3NjcmVlbi9jb21wb3NlR2FtZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvc2NyZWVuL3BsYXlHYW1lLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vc2NyZWVuQ29udHJvbGxlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvZ2FtZUNvbnRyb2xsZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2dhbWVib2FyZC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvaXNDb21wdXRlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvaXNIdW1hbi5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcGlwZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcGxheWVyLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9wdWJTdWIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3NoaXAuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9oZWxwZXJzL2dlbmVyYXRlVVVJRC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFNWR0luamVjdCAtIFZlcnNpb24gMS4yLjNcbiAqIEEgdGlueSwgaW50dWl0aXZlLCByb2J1c3QsIGNhY2hpbmcgc29sdXRpb24gZm9yIGluamVjdGluZyBTVkcgZmlsZXMgaW5saW5lIGludG8gdGhlIERPTS5cbiAqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaWNvbmZ1L3N2Zy1pbmplY3RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTggSU5DT1JTLCB0aGUgY3JlYXRvcnMgb2YgaWNvbmZ1LmNvbVxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgLSBodHRwczovL2dpdGh1Yi5jb20vaWNvbmZ1L3N2Zy1pbmplY3QvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbihmdW5jdGlvbih3aW5kb3csIGRvY3VtZW50KSB7XG4gIC8vIGNvbnN0YW50cyBmb3IgYmV0dGVyIG1pbmlmaWNhdGlvblxuICB2YXIgX0NSRUFURV9FTEVNRU5UXyA9ICdjcmVhdGVFbGVtZW50JztcbiAgdmFyIF9HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfID0gJ2dldEVsZW1lbnRzQnlUYWdOYW1lJztcbiAgdmFyIF9MRU5HVEhfID0gJ2xlbmd0aCc7XG4gIHZhciBfU1RZTEVfID0gJ3N0eWxlJztcbiAgdmFyIF9USVRMRV8gPSAndGl0bGUnO1xuICB2YXIgX1VOREVGSU5FRF8gPSAndW5kZWZpbmVkJztcbiAgdmFyIF9TRVRfQVRUUklCVVRFXyA9ICdzZXRBdHRyaWJ1dGUnO1xuICB2YXIgX0dFVF9BVFRSSUJVVEVfID0gJ2dldEF0dHJpYnV0ZSc7XG5cbiAgdmFyIE5VTEwgPSBudWxsO1xuXG4gIC8vIGNvbnN0YW50c1xuICB2YXIgX19TVkdJTkpFQ1QgPSAnX19zdmdJbmplY3QnO1xuICB2YXIgSURfU1VGRklYID0gJy0taW5qZWN0LSc7XG4gIHZhciBJRF9TVUZGSVhfUkVHRVggPSBuZXcgUmVnRXhwKElEX1NVRkZJWCArICdcXFxcZCsnLCBcImdcIik7XG4gIHZhciBMT0FEX0ZBSUwgPSAnTE9BRF9GQUlMJztcbiAgdmFyIFNWR19OT1RfU1VQUE9SVEVEID0gJ1NWR19OT1RfU1VQUE9SVEVEJztcbiAgdmFyIFNWR19JTlZBTElEID0gJ1NWR19JTlZBTElEJztcbiAgdmFyIEFUVFJJQlVURV9FWENMVVNJT05fTkFNRVMgPSBbJ3NyYycsICdhbHQnLCAnb25sb2FkJywgJ29uZXJyb3InXTtcbiAgdmFyIEFfRUxFTUVOVCA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF9dKCdhJyk7XG4gIHZhciBJU19TVkdfU1VQUE9SVEVEID0gdHlwZW9mIFNWR1JlY3QgIT0gX1VOREVGSU5FRF87XG4gIHZhciBERUZBVUxUX09QVElPTlMgPSB7XG4gICAgdXNlQ2FjaGU6IHRydWUsXG4gICAgY29weUF0dHJpYnV0ZXM6IHRydWUsXG4gICAgbWFrZUlkc1VuaXF1ZTogdHJ1ZVxuICB9O1xuICAvLyBNYXAgb2YgSVJJIHJlZmVyZW5jZWFibGUgdGFnIG5hbWVzIHRvIHByb3BlcnRpZXMgdGhhdCBjYW4gcmVmZXJlbmNlIHRoZW0uIFRoaXMgaXMgZGVmaW5lZCBpblxuICAvLyBodHRwczovL3d3dy53My5vcmcvVFIvU1ZHMTEvbGlua2luZy5odG1sI3Byb2Nlc3NpbmdJUklcbiAgdmFyIElSSV9UQUdfUFJPUEVSVElFU19NQVAgPSB7XG4gICAgY2xpcFBhdGg6IFsnY2xpcC1wYXRoJ10sXG4gICAgJ2NvbG9yLXByb2ZpbGUnOiBOVUxMLFxuICAgIGN1cnNvcjogTlVMTCxcbiAgICBmaWx0ZXI6IE5VTEwsXG4gICAgbGluZWFyR3JhZGllbnQ6IFsnZmlsbCcsICdzdHJva2UnXSxcbiAgICBtYXJrZXI6IFsnbWFya2VyJywgJ21hcmtlci1lbmQnLCAnbWFya2VyLW1pZCcsICdtYXJrZXItc3RhcnQnXSxcbiAgICBtYXNrOiBOVUxMLFxuICAgIHBhdHRlcm46IFsnZmlsbCcsICdzdHJva2UnXSxcbiAgICByYWRpYWxHcmFkaWVudDogWydmaWxsJywgJ3N0cm9rZSddXG4gIH07XG4gIHZhciBJTkpFQ1RFRCA9IDE7XG4gIHZhciBGQUlMID0gMjtcblxuICB2YXIgdW5pcXVlSWRDb3VudGVyID0gMTtcbiAgdmFyIHhtbFNlcmlhbGl6ZXI7XG4gIHZhciBkb21QYXJzZXI7XG5cblxuICAvLyBjcmVhdGVzIGFuIFNWRyBkb2N1bWVudCBmcm9tIGFuIFNWRyBzdHJpbmdcbiAgZnVuY3Rpb24gc3ZnU3RyaW5nVG9TdmdEb2Moc3ZnU3RyKSB7XG4gICAgZG9tUGFyc2VyID0gZG9tUGFyc2VyIHx8IG5ldyBET01QYXJzZXIoKTtcbiAgICByZXR1cm4gZG9tUGFyc2VyLnBhcnNlRnJvbVN0cmluZyhzdmdTdHIsICd0ZXh0L3htbCcpO1xuICB9XG5cblxuICAvLyBzZWFyaWFsaXplcyBhbiBTVkcgZWxlbWVudCB0byBhbiBTVkcgc3RyaW5nXG4gIGZ1bmN0aW9uIHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtZW50KSB7XG4gICAgeG1sU2VyaWFsaXplciA9IHhtbFNlcmlhbGl6ZXIgfHwgbmV3IFhNTFNlcmlhbGl6ZXIoKTtcbiAgICByZXR1cm4geG1sU2VyaWFsaXplci5zZXJpYWxpemVUb1N0cmluZyhzdmdFbGVtZW50KTtcbiAgfVxuXG5cbiAgLy8gUmV0dXJucyB0aGUgYWJzb2x1dGUgdXJsIGZvciB0aGUgc3BlY2lmaWVkIHVybFxuICBmdW5jdGlvbiBnZXRBYnNvbHV0ZVVybCh1cmwpIHtcbiAgICBBX0VMRU1FTlQuaHJlZiA9IHVybDtcbiAgICByZXR1cm4gQV9FTEVNRU5ULmhyZWY7XG4gIH1cblxuXG4gIC8vIExvYWQgc3ZnIHdpdGggYW4gWEhSIHJlcXVlc3RcbiAgZnVuY3Rpb24gbG9hZFN2Zyh1cmwsIGNhbGxiYWNrLCBlcnJvckNhbGxiYWNrKSB7XG4gICAgaWYgKHVybCkge1xuICAgICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgIC8vIHJlYWR5U3RhdGUgaXMgRE9ORVxuICAgICAgICAgIHZhciBzdGF0dXMgPSByZXEuc3RhdHVzO1xuICAgICAgICAgIGlmIChzdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyBpcyBPS1xuICAgICAgICAgICAgY2FsbGJhY2socmVxLnJlc3BvbnNlWE1MLCByZXEucmVzcG9uc2VUZXh0LnRyaW0oKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyBpcyBlcnJvciAoNHh4IG9yIDV4eClcbiAgICAgICAgICAgIGVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PSAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyAwIGNhbiBpbmRpY2F0ZSBhIGZhaWxlZCBjcm9zcy1kb21haW4gY2FsbFxuICAgICAgICAgICAgZXJyb3JDYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgICAgcmVxLnNlbmQoKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIENvcHkgYXR0cmlidXRlcyBmcm9tIGltZyBlbGVtZW50IHRvIHN2ZyBlbGVtZW50XG4gIGZ1bmN0aW9uIGNvcHlBdHRyaWJ1dGVzKGltZ0VsZW0sIHN2Z0VsZW0pIHtcbiAgICB2YXIgYXR0cmlidXRlO1xuICAgIHZhciBhdHRyaWJ1dGVOYW1lO1xuICAgIHZhciBhdHRyaWJ1dGVWYWx1ZTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGltZ0VsZW0uYXR0cmlidXRlcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJpYnV0ZXNbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgIGF0dHJpYnV0ZSA9IGF0dHJpYnV0ZXNbaV07XG4gICAgICBhdHRyaWJ1dGVOYW1lID0gYXR0cmlidXRlLm5hbWU7XG4gICAgICAvLyBPbmx5IGNvcHkgYXR0cmlidXRlcyBub3QgZXhwbGljaXRseSBleGNsdWRlZCBmcm9tIGNvcHlpbmdcbiAgICAgIGlmIChBVFRSSUJVVEVfRVhDTFVTSU9OX05BTUVTLmluZGV4T2YoYXR0cmlidXRlTmFtZSkgPT0gLTEpIHtcbiAgICAgICAgYXR0cmlidXRlVmFsdWUgPSBhdHRyaWJ1dGUudmFsdWU7XG4gICAgICAgIC8vIElmIGltZyBhdHRyaWJ1dGUgaXMgXCJ0aXRsZVwiLCBpbnNlcnQgYSB0aXRsZSBlbGVtZW50IGludG8gU1ZHIGVsZW1lbnRcbiAgICAgICAgaWYgKGF0dHJpYnV0ZU5hbWUgPT0gX1RJVExFXykge1xuICAgICAgICAgIHZhciB0aXRsZUVsZW07XG4gICAgICAgICAgdmFyIGZpcnN0RWxlbWVudENoaWxkID0gc3ZnRWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICBpZiAoZmlyc3RFbGVtZW50Q2hpbGQgJiYgZmlyc3RFbGVtZW50Q2hpbGQubG9jYWxOYW1lLnRvTG93ZXJDYXNlKCkgPT0gX1RJVExFXykge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFNWRyBlbGVtZW50J3MgZmlyc3QgY2hpbGQgaXMgYSB0aXRsZSBlbGVtZW50LCBrZWVwIGl0IGFzIHRoZSB0aXRsZSBlbGVtZW50XG4gICAgICAgICAgICB0aXRsZUVsZW0gPSBmaXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFNWRyBlbGVtZW50J3MgZmlyc3QgY2hpbGQgZWxlbWVudCBpcyBub3QgYSB0aXRsZSBlbGVtZW50LCBjcmVhdGUgYSBuZXcgdGl0bGVcbiAgICAgICAgICAgIC8vIGVsZSxlbXQgYW5kIHNldCBpdCBhcyB0aGUgZmlyc3QgY2hpbGRcbiAgICAgICAgICAgIHRpdGxlRWxlbSA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF8gKyAnTlMnXSgnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCBfVElUTEVfKTtcbiAgICAgICAgICAgIHN2Z0VsZW0uaW5zZXJ0QmVmb3JlKHRpdGxlRWxlbSwgZmlyc3RFbGVtZW50Q2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTZXQgbmV3IHRpdGxlIGNvbnRlbnRcbiAgICAgICAgICB0aXRsZUVsZW0udGV4dENvbnRlbnQgPSBhdHRyaWJ1dGVWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBTZXQgaW1nIGF0dHJpYnV0ZSB0byBzdmcgZWxlbWVudFxuICAgICAgICAgIHN2Z0VsZW1bX1NFVF9BVFRSSUJVVEVfXShhdHRyaWJ1dGVOYW1lLCBhdHRyaWJ1dGVWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8vIFRoaXMgZnVuY3Rpb24gYXBwZW5kcyBhIHN1ZmZpeCB0byBJRHMgb2YgcmVmZXJlbmNlZCBlbGVtZW50cyBpbiB0aGUgPGRlZnM+IGluIG9yZGVyIHRvICB0byBhdm9pZCBJRCBjb2xsaXNpb25cbiAgLy8gYmV0d2VlbiBtdWx0aXBsZSBpbmplY3RlZCBTVkdzLiBUaGUgc3VmZml4IGhhcyB0aGUgZm9ybSBcIi0taW5qZWN0LVhcIiwgd2hlcmUgWCBpcyBhIHJ1bm5pbmcgbnVtYmVyIHdoaWNoIGlzXG4gIC8vIGluY3JlbWVudGVkIHdpdGggZWFjaCBpbmplY3Rpb24uIFJlZmVyZW5jZXMgdG8gdGhlIElEcyBhcmUgYWRqdXN0ZWQgYWNjb3JkaW5nbHkuXG4gIC8vIFdlIGFzc3VtZSB0aGEgYWxsIElEcyB3aXRoaW4gdGhlIGluamVjdGVkIFNWRyBhcmUgdW5pcXVlLCB0aGVyZWZvcmUgdGhlIHNhbWUgc3VmZml4IGNhbiBiZSB1c2VkIGZvciBhbGwgSURzIG9mIG9uZVxuICAvLyBpbmplY3RlZCBTVkcuXG4gIC8vIElmIHRoZSBvbmx5UmVmZXJlbmNlZCBhcmd1bWVudCBpcyBzZXQgdG8gdHJ1ZSwgb25seSB0aG9zZSBJRHMgd2lsbCBiZSBtYWRlIHVuaXF1ZSB0aGF0IGFyZSByZWZlcmVuY2VkIGZyb20gd2l0aGluIHRoZSBTVkdcbiAgZnVuY3Rpb24gbWFrZUlkc1VuaXF1ZShzdmdFbGVtLCBvbmx5UmVmZXJlbmNlZCkge1xuICAgIHZhciBpZFN1ZmZpeCA9IElEX1NVRkZJWCArIHVuaXF1ZUlkQ291bnRlcisrO1xuICAgIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbiBmb3IgZnVuY3Rpb25hbCBub3RhdGlvbnMgb2YgYW4gSVJJIHJlZmVyZW5jZXMuIFRoaXMgd2lsbCBmaW5kIG9jY3VyZW5jZXMgaW4gdGhlIGZvcm1cbiAgICAvLyB1cmwoI2FueUlkKSBvciB1cmwoXCIjYW55SWRcIikgKGZvciBJbnRlcm5ldCBFeHBsb3JlcikgYW5kIGNhcHR1cmUgdGhlIHJlZmVyZW5jZWQgSURcbiAgICB2YXIgZnVuY0lyaVJlZ2V4ID0gL3VybFxcKFwiPyMoW2EtekEtWl1bXFx3Oi4tXSopXCI/XFwpL2c7XG4gICAgLy8gR2V0IGFsbCBlbGVtZW50cyB3aXRoIGFuIElELiBUaGUgU1ZHIHNwZWMgcmVjb21tZW5kcyB0byBwdXQgcmVmZXJlbmNlZCBlbGVtZW50cyBpbnNpZGUgPGRlZnM+IGVsZW1lbnRzLCBidXRcbiAgICAvLyB0aGlzIGlzIG5vdCBhIHJlcXVpcmVtZW50LCB0aGVyZWZvcmUgd2UgaGF2ZSB0byBzZWFyY2ggZm9yIElEcyBpbiB0aGUgd2hvbGUgU1ZHLlxuICAgIHZhciBpZEVsZW1lbnRzID0gc3ZnRWxlbS5xdWVyeVNlbGVjdG9yQWxsKCdbaWRdJyk7XG4gICAgdmFyIGlkRWxlbTtcbiAgICAvLyBBbiBvYmplY3QgY29udGFpbmluZyByZWZlcmVuY2VkIElEcyAgYXMga2V5cyBpcyB1c2VkIGlmIG9ubHkgcmVmZXJlbmNlZCBJRHMgc2hvdWxkIGJlIHVuaXF1aWZpZWQuXG4gICAgLy8gSWYgdGhpcyBvYmplY3QgZG9lcyBub3QgZXhpc3QsIGFsbCBJRHMgd2lsbCBiZSB1bmlxdWlmaWVkLlxuICAgIHZhciByZWZlcmVuY2VkSWRzID0gb25seVJlZmVyZW5jZWQgPyBbXSA6IE5VTEw7XG4gICAgdmFyIHRhZ05hbWU7XG4gICAgdmFyIGlyaVRhZ05hbWVzID0ge307XG4gICAgdmFyIGlyaVByb3BlcnRpZXMgPSBbXTtcbiAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgIHZhciBpLCBqO1xuXG4gICAgaWYgKGlkRWxlbWVudHNbX0xFTkdUSF9dKSB7XG4gICAgICAvLyBNYWtlIGFsbCBJRHMgdW5pcXVlIGJ5IGFkZGluZyB0aGUgSUQgc3VmZml4IGFuZCBjb2xsZWN0IGFsbCBlbmNvdW50ZXJlZCB0YWcgbmFtZXNcbiAgICAgIC8vIHRoYXQgYXJlIElSSSByZWZlcmVuY2VhYmxlIGZyb20gcHJvcGVyaXRpZXMuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgaWRFbGVtZW50c1tfTEVOR1RIX107IGkrKykge1xuICAgICAgICB0YWdOYW1lID0gaWRFbGVtZW50c1tpXS5sb2NhbE5hbWU7IC8vIFVzZSBub24tbmFtZXNwYWNlZCB0YWcgbmFtZVxuICAgICAgICAvLyBNYWtlIElEIHVuaXF1ZSBpZiB0YWcgbmFtZSBpcyBJUkkgcmVmZXJlbmNlYWJsZVxuICAgICAgICBpZiAodGFnTmFtZSBpbiBJUklfVEFHX1BST1BFUlRJRVNfTUFQKSB7XG4gICAgICAgICAgaXJpVGFnTmFtZXNbdGFnTmFtZV0gPSAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBHZXQgYWxsIHByb3BlcnRpZXMgdGhhdCBhcmUgbWFwcGVkIHRvIHRoZSBmb3VuZCBJUkkgcmVmZXJlbmNlYWJsZSB0YWdzXG4gICAgICBmb3IgKHRhZ05hbWUgaW4gaXJpVGFnTmFtZXMpIHtcbiAgICAgICAgKElSSV9UQUdfUFJPUEVSVElFU19NQVBbdGFnTmFtZV0gfHwgW3RhZ05hbWVdKS5mb3JFYWNoKGZ1bmN0aW9uIChtYXBwZWRQcm9wZXJ0eSkge1xuICAgICAgICAgIC8vIEFkZCBtYXBwZWQgcHJvcGVydGllcyB0byBhcnJheSBvZiBpcmkgcmVmZXJlbmNpbmcgcHJvcGVydGllcy5cbiAgICAgICAgICAvLyBVc2UgbGluZWFyIHNlYXJjaCBoZXJlIGJlY2F1c2UgdGhlIG51bWJlciBvZiBwb3NzaWJsZSBlbnRyaWVzIGlzIHZlcnkgc21hbGwgKG1heGltdW0gMTEpXG4gICAgICAgICAgaWYgKGlyaVByb3BlcnRpZXMuaW5kZXhPZihtYXBwZWRQcm9wZXJ0eSkgPCAwKSB7XG4gICAgICAgICAgICBpcmlQcm9wZXJ0aWVzLnB1c2gobWFwcGVkUHJvcGVydHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoaXJpUHJvcGVydGllc1tfTEVOR1RIX10pIHtcbiAgICAgICAgLy8gQWRkIFwic3R5bGVcIiB0byBwcm9wZXJ0aWVzLCBiZWNhdXNlIGl0IG1heSBjb250YWluIHJlZmVyZW5jZXMgaW4gdGhlIGZvcm0gJ3N0eWxlPVwiZmlsbDp1cmwoI215RmlsbClcIidcbiAgICAgICAgaXJpUHJvcGVydGllcy5wdXNoKF9TVFlMRV8pO1xuICAgICAgfVxuICAgICAgLy8gUnVuIHRocm91Z2ggYWxsIGVsZW1lbnRzIG9mIHRoZSBTVkcgYW5kIHJlcGxhY2UgSURzIGluIHJlZmVyZW5jZXMuXG4gICAgICAvLyBUbyBnZXQgYWxsIGRlc2NlbmRpbmcgZWxlbWVudHMsIGdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykgc2VlbXMgdG8gcGVyZm9ybSBmYXN0ZXIgdGhhbiBxdWVyeVNlbGVjdG9yQWxsKCcqJykuXG4gICAgICAvLyBTaW5jZSBzdmdFbGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykgZG9lcyBub3QgcmV0dXJuIHRoZSBzdmcgZWxlbWVudCBpdHNlbGYsIHdlIGhhdmUgdG8gaGFuZGxlIGl0IHNlcGFyYXRlbHkuXG4gICAgICB2YXIgZGVzY0VsZW1lbnRzID0gc3ZnRWxlbVtfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FX10oJyonKTtcbiAgICAgIHZhciBlbGVtZW50ID0gc3ZnRWxlbTtcbiAgICAgIHZhciBwcm9wZXJ0eU5hbWU7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgbmV3VmFsdWU7XG4gICAgICBmb3IgKGkgPSAtMTsgZWxlbWVudCAhPSBOVUxMOykge1xuICAgICAgICBpZiAoZWxlbWVudC5sb2NhbE5hbWUgPT0gX1NUWUxFXykge1xuICAgICAgICAgIC8vIElmIGVsZW1lbnQgaXMgYSBzdHlsZSBlbGVtZW50LCByZXBsYWNlIElEcyBpbiBhbGwgb2NjdXJlbmNlcyBvZiBcInVybCgjYW55SWQpXCIgaW4gdGV4dCBjb250ZW50XG4gICAgICAgICAgdmFsdWUgPSBlbGVtZW50LnRleHRDb250ZW50O1xuICAgICAgICAgIG5ld1ZhbHVlID0gdmFsdWUgJiYgdmFsdWUucmVwbGFjZShmdW5jSXJpUmVnZXgsIGZ1bmN0aW9uKG1hdGNoLCBpZCkge1xuICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgcmVmZXJlbmNlZElkc1tpZF0gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICd1cmwoIycgKyBpZCArIGlkU3VmZml4ICsgJyknO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIGVsZW1lbnQudGV4dENvbnRlbnQgPSBuZXdWYWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgICAvLyBSdW4gdGhyb3VnaCBhbGwgcHJvcGVydHkgbmFtZXMgZm9yIHdoaWNoIElEcyB3ZXJlIGZvdW5kXG4gICAgICAgICAgZm9yIChqID0gMDsgaiA8IGlyaVByb3BlcnRpZXNbX0xFTkdUSF9dOyBqKyspIHtcbiAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IGlyaVByb3BlcnRpZXNbal07XG4gICAgICAgICAgICB2YWx1ZSA9IGVsZW1lbnRbX0dFVF9BVFRSSUJVVEVfXShwcm9wZXJ0eU5hbWUpO1xuICAgICAgICAgICAgbmV3VmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS5yZXBsYWNlKGZ1bmNJcmlSZWdleCwgZnVuY3Rpb24obWF0Y2gsIGlkKSB7XG4gICAgICAgICAgICAgIGlmIChyZWZlcmVuY2VkSWRzKSB7XG4gICAgICAgICAgICAgICAgcmVmZXJlbmNlZElkc1tpZF0gPSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICd1cmwoIycgKyBpZCArIGlkU3VmZml4ICsgJyknO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRbX1NFVF9BVFRSSUJVVEVfXShwcm9wZXJ0eU5hbWUsIG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVwbGFjZSBJRHMgaW4geGxpbms6cmVmIGFuZCBocmVmIGF0dHJpYnV0ZXNcbiAgICAgICAgICBbJ3hsaW5rOmhyZWYnLCAnaHJlZiddLmZvckVhY2goZnVuY3Rpb24ocmVmQXR0ck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpcmkgPSBlbGVtZW50W19HRVRfQVRUUklCVVRFX10ocmVmQXR0ck5hbWUpO1xuICAgICAgICAgICAgaWYgKC9eXFxzKiMvLnRlc3QoaXJpKSkgeyAvLyBDaGVjayBpZiBpcmkgaXMgbm9uLW51bGwgYW5kIGludGVybmFsIHJlZmVyZW5jZVxuICAgICAgICAgICAgICBpcmkgPSBpcmkudHJpbSgpO1xuICAgICAgICAgICAgICBlbGVtZW50W19TRVRfQVRUUklCVVRFX10ocmVmQXR0ck5hbWUsIGlyaSArIGlkU3VmZml4KTtcbiAgICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgSUQgdG8gcmVmZXJlbmNlZCBJRHNcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VkSWRzW2lyaS5zdWJzdHJpbmcoMSldID0gMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQgPSBkZXNjRWxlbWVudHNbKytpXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpZEVsZW1lbnRzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICAgIGlkRWxlbSA9IGlkRWxlbWVudHNbaV07XG4gICAgICAgIC8vIElmIHNldCBvZiByZWZlcmVuY2VkIElEcyBleGlzdHMsIG1ha2Ugb25seSByZWZlcmVuY2VkIElEcyB1bmlxdWUsXG4gICAgICAgIC8vIG90aGVyd2lzZSBtYWtlIGFsbCBJRHMgdW5pcXVlLlxuICAgICAgICBpZiAoIXJlZmVyZW5jZWRJZHMgfHwgcmVmZXJlbmNlZElkc1tpZEVsZW0uaWRdKSB7XG4gICAgICAgICAgLy8gQWRkIHN1ZmZpeCB0byBlbGVtZW50J3MgSURcbiAgICAgICAgICBpZEVsZW0uaWQgKz0gaWRTdWZmaXg7XG4gICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmV0dXJuIHRydWUgaWYgU1ZHIGVsZW1lbnQgaGFzIGNoYW5nZWRcbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG5cbiAgLy8gRm9yIGNhY2hlZCBTVkdzIHRoZSBJRHMgYXJlIG1hZGUgdW5pcXVlIGJ5IHNpbXBseSByZXBsYWNpbmcgdGhlIGFscmVhZHkgaW5zZXJ0ZWQgdW5pcXVlIElEcyB3aXRoIGFcbiAgLy8gaGlnaGVyIElEIGNvdW50ZXIuIFRoaXMgaXMgbXVjaCBtb3JlIHBlcmZvcm1hbnQgdGhhbiBhIGNhbGwgdG8gbWFrZUlkc1VuaXF1ZSgpLlxuICBmdW5jdGlvbiBtYWtlSWRzVW5pcXVlQ2FjaGVkKHN2Z1N0cmluZykge1xuICAgIHJldHVybiBzdmdTdHJpbmcucmVwbGFjZShJRF9TVUZGSVhfUkVHRVgsIElEX1NVRkZJWCArIHVuaXF1ZUlkQ291bnRlcisrKTtcbiAgfVxuXG5cbiAgLy8gSW5qZWN0IFNWRyBieSByZXBsYWNpbmcgdGhlIGltZyBlbGVtZW50IHdpdGggdGhlIFNWRyBlbGVtZW50IGluIHRoZSBET01cbiAgZnVuY3Rpb24gaW5qZWN0KGltZ0VsZW0sIHN2Z0VsZW0sIGFic1VybCwgb3B0aW9ucykge1xuICAgIGlmIChzdmdFbGVtKSB7XG4gICAgICBzdmdFbGVtW19TRVRfQVRUUklCVVRFX10oJ2RhdGEtaW5qZWN0LXVybCcsIGFic1VybCk7XG4gICAgICB2YXIgcGFyZW50Tm9kZSA9IGltZ0VsZW0ucGFyZW50Tm9kZTtcbiAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNvcHlBdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgY29weUF0dHJpYnV0ZXMoaW1nRWxlbSwgc3ZnRWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSW52b2tlIGJlZm9yZUluamVjdCBob29rIGlmIHNldFxuICAgICAgICB2YXIgYmVmb3JlSW5qZWN0ID0gb3B0aW9ucy5iZWZvcmVJbmplY3Q7XG4gICAgICAgIHZhciBpbmplY3RFbGVtID0gKGJlZm9yZUluamVjdCAmJiBiZWZvcmVJbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSkpIHx8IHN2Z0VsZW07XG4gICAgICAgIC8vIFJlcGxhY2UgaW1nIGVsZW1lbnQgd2l0aCBuZXcgZWxlbWVudC4gVGhpcyBpcyB0aGUgYWN0dWFsIGluamVjdGlvbi5cbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoaW5qZWN0RWxlbSwgaW1nRWxlbSk7XG4gICAgICAgIC8vIE1hcmsgaW1nIGVsZW1lbnQgYXMgaW5qZWN0ZWRcbiAgICAgICAgaW1nRWxlbVtfX1NWR0lOSkVDVF0gPSBJTkpFQ1RFRDtcbiAgICAgICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pO1xuICAgICAgICAvLyBJbnZva2UgYWZ0ZXJJbmplY3QgaG9vayBpZiBzZXRcbiAgICAgICAgdmFyIGFmdGVySW5qZWN0ID0gb3B0aW9ucy5hZnRlckluamVjdDtcbiAgICAgICAgaWYgKGFmdGVySW5qZWN0KSB7XG4gICAgICAgICAgYWZ0ZXJJbmplY3QoaW1nRWxlbSwgaW5qZWN0RWxlbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIE1lcmdlcyBhbnkgbnVtYmVyIG9mIG9wdGlvbnMgb2JqZWN0cyBpbnRvIGEgbmV3IG9iamVjdFxuICBmdW5jdGlvbiBtZXJnZU9wdGlvbnMoKSB7XG4gICAgdmFyIG1lcmdlZE9wdGlvbnMgPSB7fTtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAvLyBJdGVyYXRlIG92ZXIgYWxsIHNwZWNpZmllZCBvcHRpb25zIG9iamVjdHMgYW5kIGFkZCBhbGwgcHJvcGVydGllcyB0byB0aGUgbmV3IG9wdGlvbnMgb2JqZWN0XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICB2YXIgYXJndW1lbnQgPSBhcmdzW2ldO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnQpIHtcbiAgICAgICAgICBpZiAoYXJndW1lbnQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgbWVyZ2VkT3B0aW9uc1trZXldID0gYXJndW1lbnRba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICByZXR1cm4gbWVyZ2VkT3B0aW9ucztcbiAgfVxuXG5cbiAgLy8gQWRkcyB0aGUgc3BlY2lmaWVkIENTUyB0byB0aGUgZG9jdW1lbnQncyA8aGVhZD4gZWxlbWVudFxuICBmdW5jdGlvbiBhZGRTdHlsZVRvSGVhZChjc3MpIHtcbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50W19HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfXSgnaGVhZCcpWzBdO1xuICAgIGlmIChoZWFkKSB7XG4gICAgICB2YXIgc3R5bGUgPSBkb2N1bWVudFtfQ1JFQVRFX0VMRU1FTlRfXShfU1RZTEVfKTtcbiAgICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIEJ1aWxkcyBhbiBTVkcgZWxlbWVudCBmcm9tIHRoZSBzcGVjaWZpZWQgU1ZHIHN0cmluZ1xuICBmdW5jdGlvbiBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyLCB2ZXJpZnkpIHtcbiAgICBpZiAodmVyaWZ5KSB7XG4gICAgICB2YXIgc3ZnRG9jO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gUGFyc2UgdGhlIFNWRyBzdHJpbmcgd2l0aCBET01QYXJzZXJcbiAgICAgICAgc3ZnRG9jID0gc3ZnU3RyaW5nVG9TdmdEb2Moc3ZnU3RyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gTlVMTDtcbiAgICAgIH1cbiAgICAgIGlmIChzdmdEb2NbX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV9dKCdwYXJzZXJlcnJvcicpW19MRU5HVEhfXSkge1xuICAgICAgICAvLyBET01QYXJzZXIgZG9lcyBub3QgdGhyb3cgYW4gZXhjZXB0aW9uLCBidXQgaW5zdGVhZCBwdXRzIHBhcnNlcmVycm9yIHRhZ3MgaW4gdGhlIGRvY3VtZW50XG4gICAgICAgIHJldHVybiBOVUxMO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN2Z0RvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpdi5pbm5lckhUTUwgPSBzdmdTdHI7XG4gICAgICByZXR1cm4gZGl2LmZpcnN0RWxlbWVudENoaWxkO1xuICAgIH1cbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pIHtcbiAgICAvLyBSZW1vdmUgdGhlIG9ubG9hZCBhdHRyaWJ1dGUuIFNob3VsZCBvbmx5IGJlIHVzZWQgdG8gcmVtb3ZlIHRoZSB1bnN0eWxlZCBpbWFnZSBmbGFzaCBwcm90ZWN0aW9uIGFuZFxuICAgIC8vIG1ha2UgdGhlIGVsZW1lbnQgdmlzaWJsZSwgbm90IGZvciByZW1vdmluZyB0aGUgZXZlbnQgbGlzdGVuZXIuXG4gICAgaW1nRWxlbS5yZW1vdmVBdHRyaWJ1dGUoJ29ubG9hZCcpO1xuICB9XG5cblxuICBmdW5jdGlvbiBlcnJvck1lc3NhZ2UobXNnKSB7XG4gICAgY29uc29sZS5lcnJvcignU1ZHSW5qZWN0OiAnICsgbXNnKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZmFpbChpbWdFbGVtLCBzdGF0dXMsIG9wdGlvbnMpIHtcbiAgICBpbWdFbGVtW19fU1ZHSU5KRUNUXSA9IEZBSUw7XG4gICAgaWYgKG9wdGlvbnMub25GYWlsKSB7XG4gICAgICBvcHRpb25zLm9uRmFpbChpbWdFbGVtLCBzdGF0dXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvck1lc3NhZ2Uoc3RhdHVzKTtcbiAgICB9XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucykge1xuICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWdFbGVtKTtcbiAgICBmYWlsKGltZ0VsZW0sIFNWR19JTlZBTElELCBvcHRpb25zKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3ZnTm90U3VwcG9ydGVkKGltZ0VsZW0sIG9wdGlvbnMpIHtcbiAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSk7XG4gICAgZmFpbChpbWdFbGVtLCBTVkdfTk9UX1NVUFBPUlRFRCwgb3B0aW9ucyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpIHtcbiAgICBmYWlsKGltZ0VsZW0sIExPQURfRkFJTCwgb3B0aW9ucyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZ0VsZW0pIHtcbiAgICBpbWdFbGVtLm9ubG9hZCA9IE5VTEw7XG4gICAgaW1nRWxlbS5vbmVycm9yID0gTlVMTDtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gaW1nTm90U2V0KG1zZykge1xuICAgIGVycm9yTWVzc2FnZSgnbm8gaW1nIGVsZW1lbnQnKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gY3JlYXRlU1ZHSW5qZWN0KGdsb2JhbE5hbWUsIG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoREVGQVVMVF9PUFRJT05TLCBvcHRpb25zKTtcbiAgICB2YXIgc3ZnTG9hZENhY2hlID0ge307XG5cbiAgICBpZiAoSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgLy8gSWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgU1ZHLCBhZGQgYSBzbWFsbCBzdHlsZXNoZWV0IHRoYXQgaGlkZXMgdGhlIDxpbWc+IGVsZW1lbnRzIHVudGlsXG4gICAgICAvLyBpbmplY3Rpb24gaXMgZmluaXNoZWQuIFRoaXMgYXZvaWRzIHNob3dpbmcgdGhlIHVuc3R5bGVkIFNWR3MgYmVmb3JlIHN0eWxlIGlzIGFwcGxpZWQuXG4gICAgICBhZGRTdHlsZVRvSGVhZCgnaW1nW29ubG9hZF49XCInICsgZ2xvYmFsTmFtZSArICcoXCJde3Zpc2liaWxpdHk6aGlkZGVuO30nKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNWR0luamVjdFxuICAgICAqXG4gICAgICogSW5qZWN0cyB0aGUgU1ZHIHNwZWNpZmllZCBpbiB0aGUgYHNyY2AgYXR0cmlidXRlIG9mIHRoZSBzcGVjaWZpZWQgYGltZ2AgZWxlbWVudCBvciBhcnJheSBvZiBgaW1nYFxuICAgICAqIGVsZW1lbnRzLiBSZXR1cm5zIGEgUHJvbWlzZSBvYmplY3Qgd2hpY2ggcmVzb2x2ZXMgaWYgYWxsIHBhc3NlZCBpbiBgaW1nYCBlbGVtZW50cyBoYXZlIGVpdGhlciBiZWVuXG4gICAgICogaW5qZWN0ZWQgb3IgZmFpbGVkIHRvIGluamVjdCAoT25seSBpZiBhIGdsb2JhbCBQcm9taXNlIG9iamVjdCBpcyBhdmFpbGFibGUgbGlrZSBpbiBhbGwgbW9kZXJuIGJyb3dzZXJzXG4gICAgICogb3IgdGhyb3VnaCBhIHBvbHlmaWxsKS5cbiAgICAgKlxuICAgICAqIE9wdGlvbnM6XG4gICAgICogdXNlQ2FjaGU6IElmIHNldCB0byBgdHJ1ZWAgdGhlIFNWRyB3aWxsIGJlIGNhY2hlZCB1c2luZyB0aGUgYWJzb2x1dGUgVVJMLiBEZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC5cbiAgICAgKiBjb3B5QXR0cmlidXRlczogSWYgc2V0IHRvIGB0cnVlYCB0aGUgYXR0cmlidXRlcyB3aWxsIGJlIGNvcGllZCBmcm9tIGBpbWdgIHRvIGBzdmdgLiBEZmF1bHQgdmFsdWVcbiAgICAgKiAgICAgaXMgYHRydWVgLlxuICAgICAqIG1ha2VJZHNVbmlxdWU6IElmIHNldCB0byBgdHJ1ZWAgdGhlIElEIG9mIGVsZW1lbnRzIGluIHRoZSBgPGRlZnM+YCBlbGVtZW50IHRoYXQgY2FuIGJlIHJlZmVyZW5jZXMgYnlcbiAgICAgKiAgICAgcHJvcGVydHkgdmFsdWVzIChmb3IgZXhhbXBsZSAnY2xpcFBhdGgnKSBhcmUgbWFkZSB1bmlxdWUgYnkgYXBwZW5kaW5nIFwiLS1pbmplY3QtWFwiLCB3aGVyZSBYIGlzIGFcbiAgICAgKiAgICAgcnVubmluZyBudW1iZXIgd2hpY2ggaW5jcmVhc2VzIHdpdGggZWFjaCBpbmplY3Rpb24uIFRoaXMgaXMgZG9uZSB0byBhdm9pZCBkdXBsaWNhdGUgSURzIGluIHRoZSBET00uXG4gICAgICogYmVmb3JlTG9hZDogSG9vayBiZWZvcmUgU1ZHIGlzIGxvYWRlZC4gVGhlIGBpbWdgIGVsZW1lbnQgaXMgcGFzc2VkIGFzIGEgcGFyYW1ldGVyLiBJZiB0aGUgaG9vayByZXR1cm5zXG4gICAgICogICAgIGEgc3RyaW5nIGl0IGlzIHVzZWQgYXMgdGhlIFVSTCBpbnN0ZWFkIG9mIHRoZSBgaW1nYCBlbGVtZW50J3MgYHNyY2AgYXR0cmlidXRlLlxuICAgICAqIGFmdGVyTG9hZDogSG9vayBhZnRlciBTVkcgaXMgbG9hZGVkLiBUaGUgbG9hZGVkIGBzdmdgIGVsZW1lbnQgYW5kIGBzdmdgIHN0cmluZyBhcmUgcGFzc2VkIGFzIGFcbiAgICAgKiAgICAgcGFyYW1ldGVycy4gSWYgY2FjaGluZyBpcyBhY3RpdmUgdGhpcyBob29rIHdpbGwgb25seSBnZXQgY2FsbGVkIG9uY2UgZm9yIGluamVjdGVkIFNWR3Mgd2l0aCB0aGVcbiAgICAgKiAgICAgc2FtZSBhYnNvbHV0ZSBwYXRoLiBDaGFuZ2VzIHRvIHRoZSBgc3ZnYCBlbGVtZW50IGluIHRoaXMgaG9vayB3aWxsIGJlIGFwcGxpZWQgdG8gYWxsIGluamVjdGVkIFNWR3NcbiAgICAgKiAgICAgd2l0aCB0aGUgc2FtZSBhYnNvbHV0ZSBwYXRoLiBJdCdzIGFsc28gcG9zc2libGUgdG8gcmV0dXJuIGFuIGBzdmdgIHN0cmluZyBvciBgc3ZnYCBlbGVtZW50IHdoaWNoXG4gICAgICogICAgIHdpbGwgdGhlbiBiZSB1c2VkIGZvciB0aGUgaW5qZWN0aW9uLlxuICAgICAqIGJlZm9yZUluamVjdDogSG9vayBiZWZvcmUgU1ZHIGlzIGluamVjdGVkLiBUaGUgYGltZ2AgYW5kIGBzdmdgIGVsZW1lbnRzIGFyZSBwYXNzZWQgYXMgcGFyYW1ldGVycy4gSWZcbiAgICAgKiAgICAgYW55IGh0bWwgZWxlbWVudCBpcyByZXR1cm5lZCBpdCBnZXRzIGluamVjdGVkIGluc3RlYWQgb2YgYXBwbHlpbmcgdGhlIGRlZmF1bHQgU1ZHIGluamVjdGlvbi5cbiAgICAgKiBhZnRlckluamVjdDogSG9vayBhZnRlciBTVkcgaXMgaW5qZWN0ZWQuIFRoZSBgaW1nYCBhbmQgYHN2Z2AgZWxlbWVudHMgYXJlIHBhc3NlZCBhcyBwYXJhbWV0ZXJzLlxuICAgICAqIG9uQWxsRmluaXNoOiBIb29rIGFmdGVyIGFsbCBgaW1nYCBlbGVtZW50cyBwYXNzZWQgdG8gYW4gU1ZHSW5qZWN0KCkgY2FsbCBoYXZlIGVpdGhlciBiZWVuIGluamVjdGVkIG9yXG4gICAgICogICAgIGZhaWxlZCB0byBpbmplY3QuXG4gICAgICogb25GYWlsOiBIb29rIGFmdGVyIGluamVjdGlvbiBmYWlscy4gVGhlIGBpbWdgIGVsZW1lbnQgYW5kIGEgYHN0YXR1c2Agc3RyaW5nIGFyZSBwYXNzZWQgYXMgYW4gcGFyYW1ldGVyLlxuICAgICAqICAgICBUaGUgYHN0YXR1c2AgY2FuIGJlIGVpdGhlciBgJ1NWR19OT1RfU1VQUE9SVEVEJ2AgKHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgU1ZHKSxcbiAgICAgKiAgICAgYCdTVkdfSU5WQUxJRCdgICh0aGUgU1ZHIGlzIG5vdCBpbiBhIHZhbGlkIGZvcm1hdCkgb3IgYCdMT0FEX0ZBSUxFRCdgIChsb2FkaW5nIG9mIHRoZSBTVkcgZmFpbGVkKS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEltYWdlRWxlbWVudH0gaW1nIC0gYW4gaW1nIGVsZW1lbnQgb3IgYW4gYXJyYXkgb2YgaW1nIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIG9wdGlvbmFsIHBhcmFtZXRlciB3aXRoIFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIHRoaXMgaW5qZWN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNWR0luamVjdChpbWcsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgICB2YXIgcnVuID0gZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICB2YXIgYWxsRmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG9uQWxsRmluaXNoID0gb3B0aW9ucy5vbkFsbEZpbmlzaDtcbiAgICAgICAgICBpZiAob25BbGxGaW5pc2gpIHtcbiAgICAgICAgICAgIG9uQWxsRmluaXNoKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUgJiYgcmVzb2x2ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChpbWcgJiYgdHlwZW9mIGltZ1tfTEVOR1RIX10gIT0gX1VOREVGSU5FRF8pIHtcbiAgICAgICAgICAvLyBhbiBhcnJheSBsaWtlIHN0cnVjdHVyZSBvZiBpbWcgZWxlbWVudHNcbiAgICAgICAgICB2YXIgaW5qZWN0SW5kZXggPSAwO1xuICAgICAgICAgIHZhciBpbmplY3RDb3VudCA9IGltZ1tfTEVOR1RIX107XG5cbiAgICAgICAgICBpZiAoaW5qZWN0Q291bnQgPT0gMCkge1xuICAgICAgICAgICAgYWxsRmluaXNoKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBmaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKCsraW5qZWN0SW5kZXggPT0gaW5qZWN0Q291bnQpIHtcbiAgICAgICAgICAgICAgICBhbGxGaW5pc2goKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmplY3RDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICAgIFNWR0luamVjdEVsZW1lbnQoaW1nW2ldLCBvcHRpb25zLCBmaW5pc2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvbmx5IG9uZSBpbWcgZWxlbWVudFxuICAgICAgICAgIFNWR0luamVjdEVsZW1lbnQoaW1nLCBvcHRpb25zLCBhbGxGaW5pc2gpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyByZXR1cm4gYSBQcm9taXNlIG9iamVjdCBpZiBnbG9iYWxseSBhdmFpbGFibGVcbiAgICAgIHJldHVybiB0eXBlb2YgUHJvbWlzZSA9PSBfVU5ERUZJTkVEXyA/IHJ1bigpIDogbmV3IFByb21pc2UocnVuKTtcbiAgICB9XG5cblxuICAgIC8vIEluamVjdHMgYSBzaW5nbGUgc3ZnIGVsZW1lbnQuIE9wdGlvbnMgbXVzdCBiZSBhbHJlYWR5IG1lcmdlZCB3aXRoIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAgZnVuY3Rpb24gU1ZHSW5qZWN0RWxlbWVudChpbWdFbGVtLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgaWYgKGltZ0VsZW0pIHtcbiAgICAgICAgdmFyIHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlID0gaW1nRWxlbVtfX1NWR0lOSkVDVF07XG4gICAgICAgIGlmICghc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUpIHtcbiAgICAgICAgICByZW1vdmVFdmVudExpc3RlbmVycyhpbWdFbGVtKTtcblxuICAgICAgICAgIGlmICghSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgICAgICAgc3ZnTm90U3VwcG9ydGVkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSW52b2tlIGJlZm9yZUxvYWQgaG9vayBpZiBzZXQuIElmIHRoZSBiZWZvcmVMb2FkIHJldHVybnMgYSB2YWx1ZSB1c2UgaXQgYXMgdGhlIHNyYyBmb3IgdGhlIGxvYWRcbiAgICAgICAgICAvLyBVUkwgcGF0aC4gRWxzZSB1c2UgdGhlIGltZ0VsZW0ncyBzcmMgYXR0cmlidXRlIHZhbHVlLlxuICAgICAgICAgIHZhciBiZWZvcmVMb2FkID0gb3B0aW9ucy5iZWZvcmVMb2FkO1xuICAgICAgICAgIHZhciBzcmMgPSAoYmVmb3JlTG9hZCAmJiBiZWZvcmVMb2FkKGltZ0VsZW0pKSB8fCBpbWdFbGVtW19HRVRfQVRUUklCVVRFX10oJ3NyYycpO1xuXG4gICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgIC8vIElmIG5vIGltYWdlIHNyYyBhdHRyaWJ1dGUgaXMgc2V0IGRvIG5vIGluamVjdGlvbi4gVGhpcyBjYW4gb25seSBiZSByZWFjaGVkIGJ5IHVzaW5nIGphdmFzY3JpcHRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaWYgbm8gc3JjIGF0dHJpYnV0ZSBpcyBzZXQgdGhlIG9ubG9hZCBhbmQgb25lcnJvciBldmVudHMgZG8gbm90IGdldCBjYWxsZWRcbiAgICAgICAgICAgIGlmIChzcmMgPT09ICcnKSB7XG4gICAgICAgICAgICAgIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBzZXQgYXJyYXkgc28gbGF0ZXIgY2FsbHMgY2FuIHJlZ2lzdGVyIGNhbGxiYWNrc1xuICAgICAgICAgIHZhciBvbkZpbmlzaENhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgIGltZ0VsZW1bX19TVkdJTkpFQ1RdID0gb25GaW5pc2hDYWxsYmFja3M7XG5cbiAgICAgICAgICB2YXIgb25GaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICBvbkZpbmlzaENhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKG9uRmluaXNoQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgb25GaW5pc2hDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHZhciBhYnNVcmwgPSBnZXRBYnNvbHV0ZVVybChzcmMpO1xuICAgICAgICAgIHZhciB1c2VDYWNoZU9wdGlvbiA9IG9wdGlvbnMudXNlQ2FjaGU7XG4gICAgICAgICAgdmFyIG1ha2VJZHNVbmlxdWVPcHRpb24gPSBvcHRpb25zLm1ha2VJZHNVbmlxdWU7XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIHNldFN2Z0xvYWRDYWNoZVZhbHVlID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FjaGVPcHRpb24pIHtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0uZm9yRWFjaChmdW5jdGlvbihzdmdMb2FkKSB7XG4gICAgICAgICAgICAgICAgc3ZnTG9hZCh2YWwpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0gPSB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmICh1c2VDYWNoZU9wdGlvbikge1xuICAgICAgICAgICAgdmFyIHN2Z0xvYWQgPSBzdmdMb2FkQ2FjaGVbYWJzVXJsXTtcblxuICAgICAgICAgICAgdmFyIGhhbmRsZUxvYWRWYWx1ZSA9IGZ1bmN0aW9uKGxvYWRWYWx1ZSkge1xuICAgICAgICAgICAgICBpZiAobG9hZFZhbHVlID09PSBMT0FEX0ZBSUwpIHtcbiAgICAgICAgICAgICAgICBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2FkVmFsdWUgPT09IFNWR19JTlZBTElEKSB7XG4gICAgICAgICAgICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzVW5pcXVlSWRzID0gbG9hZFZhbHVlWzBdO1xuICAgICAgICAgICAgICAgIHZhciBzdmdTdHJpbmcgPSBsb2FkVmFsdWVbMV07XG4gICAgICAgICAgICAgICAgdmFyIHVuaXF1ZUlkc1N2Z1N0cmluZyA9IGxvYWRWYWx1ZVsyXTtcbiAgICAgICAgICAgICAgICB2YXIgc3ZnRWxlbTtcblxuICAgICAgICAgICAgICAgIGlmIChtYWtlSWRzVW5pcXVlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaGFzVW5pcXVlSWRzID09PSBOVUxMKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElEcyBmb3IgdGhlIFNWRyBzdHJpbmcgaGF2ZSBub3QgYmVlbiBtYWRlIHVuaXF1ZSBiZWZvcmUuIFRoaXMgbWF5IGhhcHBlbiBpZiBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAvLyBpbmplY3Rpb24gb2YgYSBjYWNoZWQgU1ZHIGhhdmUgYmVlbiBydW4gd2l0aCB0aGUgb3B0aW9uIG1ha2VkSWRzVW5pcXVlIHNldCB0byBmYWxzZVxuICAgICAgICAgICAgICAgICAgICBzdmdFbGVtID0gYnVpbGRTdmdFbGVtZW50KHN2Z1N0cmluZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBoYXNVbmlxdWVJZHMgPSBtYWtlSWRzVW5pcXVlKHN2Z0VsZW0sIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgICAgICBsb2FkVmFsdWVbMF0gPSBoYXNVbmlxdWVJZHM7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRWYWx1ZVsyXSA9IGhhc1VuaXF1ZUlkcyAmJiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1VuaXF1ZUlkcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIElEcyB1bmlxdWUgZm9yIGFscmVhZHkgY2FjaGVkIFNWR3Mgd2l0aCBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgICAgICAgICAgc3ZnU3RyaW5nID0gbWFrZUlkc1VuaXF1ZUNhY2hlZCh1bmlxdWVJZHNTdmdTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN2Z0VsZW0gPSBzdmdFbGVtIHx8IGJ1aWxkU3ZnRWxlbWVudChzdmdTdHJpbmcsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGluamVjdChpbWdFbGVtLCBzdmdFbGVtLCBhYnNVcmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHN2Z0xvYWQgIT0gX1VOREVGSU5FRF8pIHtcbiAgICAgICAgICAgICAgLy8gVmFsdWUgZm9yIHVybCBleGlzdHMgaW4gY2FjaGVcbiAgICAgICAgICAgICAgaWYgKHN2Z0xvYWQuaXNDYWxsYmFja1F1ZXVlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2FtZSB1cmwgaGFzIGJlZW4gY2FjaGVkLCBidXQgdmFsdWUgaGFzIG5vdCBiZWVuIGxvYWRlZCB5ZXQsIHNvIGFkZCB0byBjYWxsYmFja3NcbiAgICAgICAgICAgICAgICBzdmdMb2FkLnB1c2goaGFuZGxlTG9hZFZhbHVlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVMb2FkVmFsdWUoc3ZnTG9hZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHN2Z0xvYWQgPSBbXTtcbiAgICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5IGlzQ2FsbGJhY2tRdWV1ZSB0byBBcnJheSB0byBkaWZmZXJlbnRpYXRlIGZyb20gYXJyYXkgd2l0aCBjYWNoZWQgbG9hZGVkIHZhbHVlc1xuICAgICAgICAgICAgICBzdmdMb2FkLmlzQ2FsbGJhY2tRdWV1ZSA9IHRydWU7XG4gICAgICAgICAgICAgIHN2Z0xvYWRDYWNoZVthYnNVcmxdID0gc3ZnTG9hZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBMb2FkIHRoZSBTVkcgYmVjYXVzZSBpdCBpcyBub3QgY2FjaGVkIG9yIGNhY2hpbmcgaXMgZGlzYWJsZWRcbiAgICAgICAgICBsb2FkU3ZnKGFic1VybCwgZnVuY3Rpb24oc3ZnWG1sLCBzdmdTdHJpbmcpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgWE1MIGZyb20gdGhlIFhIUiByZXF1ZXN0IGlmIGl0IGlzIGFuIGluc3RhbmNlIG9mIERvY3VtZW50LiBPdGhlcndpc2VcbiAgICAgICAgICAgIC8vIChmb3IgZXhhbXBsZSBvZiBJRTkpLCBjcmVhdGUgdGhlIHN2ZyBkb2N1bWVudCBmcm9tIHRoZSBzdmcgc3RyaW5nLlxuICAgICAgICAgICAgdmFyIHN2Z0VsZW0gPSBzdmdYbWwgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHN2Z1htbC5kb2N1bWVudEVsZW1lbnQgOiBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyaW5nLCB0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGFmdGVyTG9hZCA9IG9wdGlvbnMuYWZ0ZXJMb2FkO1xuICAgICAgICAgICAgaWYgKGFmdGVyTG9hZCkge1xuICAgICAgICAgICAgICAvLyBJbnZva2UgYWZ0ZXJMb2FkIGhvb2sgd2hpY2ggbWF5IG1vZGlmeSB0aGUgU1ZHIGVsZW1lbnQuIEFmdGVyIGxvYWQgbWF5IGFsc28gcmV0dXJuIGEgbmV3XG4gICAgICAgICAgICAgIC8vIHN2ZyBlbGVtZW50IG9yIHN2ZyBzdHJpbmdcbiAgICAgICAgICAgICAgdmFyIHN2Z0VsZW1PclN2Z1N0cmluZyA9IGFmdGVyTG9hZChzdmdFbGVtLCBzdmdTdHJpbmcpIHx8IHN2Z0VsZW07XG4gICAgICAgICAgICAgIGlmIChzdmdFbGVtT3JTdmdTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgc3ZnRWxlbSBhbmQgc3ZnU3RyaW5nIGJlY2F1c2Ugb2YgbW9kaWZpY2F0aW9ucyB0byB0aGUgU1ZHIGVsZW1lbnQgb3IgU1ZHIHN0cmluZyBpblxuICAgICAgICAgICAgICAgIC8vIHRoZSBhZnRlckxvYWQgaG9vaywgc28gdGhlIG1vZGlmaWVkIFNWRyBpcyBhbHNvIHVzZWQgZm9yIGFsbCBsYXRlciBjYWNoZWQgaW5qZWN0aW9uc1xuICAgICAgICAgICAgICAgIHZhciBpc1N0cmluZyA9IHR5cGVvZiBzdmdFbGVtT3JTdmdTdHJpbmcgPT0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgc3ZnU3RyaW5nID0gaXNTdHJpbmcgPyBzdmdFbGVtT3JTdmdTdHJpbmcgOiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgc3ZnRWxlbSA9IGlzU3RyaW5nID8gYnVpbGRTdmdFbGVtZW50KHN2Z0VsZW1PclN2Z1N0cmluZywgdHJ1ZSkgOiBzdmdFbGVtT3JTdmdTdHJpbmc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN2Z0VsZW0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgICAgICAgICAgIHZhciBoYXNVbmlxdWVJZHMgPSBOVUxMO1xuICAgICAgICAgICAgICBpZiAobWFrZUlkc1VuaXF1ZU9wdGlvbikge1xuICAgICAgICAgICAgICAgIGhhc1VuaXF1ZUlkcyA9IG1ha2VJZHNVbmlxdWUoc3ZnRWxlbSwgZmFsc2UpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHVzZUNhY2hlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVuaXF1ZUlkc1N2Z1N0cmluZyA9IGhhc1VuaXF1ZUlkcyAmJiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgLy8gc2V0IGFuIGFycmF5IHdpdGggdGhyZWUgZW50cmllcyB0byB0aGUgbG9hZCBjYWNoZVxuICAgICAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKFtoYXNVbmlxdWVJZHMsIHN2Z1N0cmluZywgdW5pcXVlSWRzU3ZnU3RyaW5nXSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSwgYWJzVXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKFNWR19JTlZBTElEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKExPQURfRkFJTCk7XG4gICAgICAgICAgICBvbkZpbmlzaCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlKSkge1xuICAgICAgICAgICAgLy8gc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUgaXMgYW4gYXJyYXkuIEluamVjdGlvbiBpcyBub3QgY29tcGxldGUgc28gcmVnaXN0ZXIgY2FsbGJhY2tcbiAgICAgICAgICAgIHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW1nTm90U2V0KCk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBkZWZhdWx0IFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIFNWR0luamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBkZWZhdWx0IFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIGFuIGluamVjdGlvbi5cbiAgICAgKi9cbiAgICBTVkdJbmplY3Quc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIGRlZmF1bHRPcHRpb25zID0gbWVyZ2VPcHRpb25zKGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKTtcbiAgICB9O1xuXG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgU1ZHSW5qZWN0XG4gICAgU1ZHSW5qZWN0LmNyZWF0ZSA9IGNyZWF0ZVNWR0luamVjdDtcblxuXG4gICAgLyoqXG4gICAgICogVXNlZCBpbiBvbmVycm9yIEV2ZW50IG9mIGFuIGA8aW1nPmAgZWxlbWVudCB0byBoYW5kbGUgY2FzZXMgd2hlbiB0aGUgbG9hZGluZyB0aGUgb3JpZ2luYWwgc3JjIGZhaWxzXG4gICAgICogKGZvciBleGFtcGxlIGlmIGZpbGUgaXMgbm90IGZvdW5kIG9yIGlmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgU1ZHKS4gVGhpcyB0cmlnZ2VycyBhIGNhbGwgdG8gdGhlXG4gICAgICogb3B0aW9ucyBvbkZhaWwgaG9vayBpZiBhdmFpbGFibGUuIFRoZSBvcHRpb25hbCBzZWNvbmQgcGFyYW1ldGVyIHdpbGwgYmUgc2V0IGFzIHRoZSBuZXcgc3JjIGF0dHJpYnV0ZVxuICAgICAqIGZvciB0aGUgaW1nIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxJbWFnZUVsZW1lbnR9IGltZyAtIGFuIGltZyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtmYWxsYmFja1NyY10gLSBvcHRpb25hbCBwYXJhbWV0ZXIgZmFsbGJhY2sgc3JjXG4gICAgICovXG4gICAgU1ZHSW5qZWN0LmVyciA9IGZ1bmN0aW9uKGltZywgZmFsbGJhY2tTcmMpIHtcbiAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgaWYgKGltZ1tfX1NWR0lOSkVDVF0gIT0gRkFJTCkge1xuICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZyk7XG5cbiAgICAgICAgICBpZiAoIUlTX1NWR19TVVBQT1JURUQpIHtcbiAgICAgICAgICAgIHN2Z05vdFN1cHBvcnRlZChpbWcsIGRlZmF1bHRPcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZyk7XG4gICAgICAgICAgICBsb2FkRmFpbChpbWcsIGRlZmF1bHRPcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZhbGxiYWNrU3JjKSB7XG4gICAgICAgICAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nKTtcbiAgICAgICAgICAgIGltZy5zcmMgPSBmYWxsYmFja1NyYztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGltZ05vdFNldCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3dbZ2xvYmFsTmFtZV0gPSBTVkdJbmplY3Q7XG5cbiAgICByZXR1cm4gU1ZHSW5qZWN0O1xuICB9XG5cbiAgdmFyIFNWR0luamVjdEluc3RhbmNlID0gY3JlYXRlU1ZHSW5qZWN0KCdTVkdJbmplY3QnKTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNWR0luamVjdEluc3RhbmNlO1xuICB9XG59KSh3aW5kb3csIGRvY3VtZW50KTsiLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvZ2V0VXJsLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18gPSBuZXcgVVJMKFwiLi9hc3NldHMvZm9udHMvUm9ib3RvX0NvbmRlbnNlZC9zdGF0aWMvUm9ib3RvQ29uZGVuc2VkLU1lZGl1bS50dGZcIiwgaW1wb3J0Lm1ldGEudXJsKTtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19fID0gX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYEBmb250LWZhY2Uge1xuICAvKiBodHRwczovL2ZvbnRzLmdvb2dsZS5jb20vc3BlY2ltZW4vUm9ib3RvK0NvbmRlbnNlZCAqL1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xuICBzcmM6IHVybCgke19fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX199KTtcbiAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xufVxuXG46cm9vdCB7XG4gIC0tY29sb3ItZm9udC1wcmltYXJ5OiAjMDAwMDAwO1xuICAtLWNvbG9yLWZvbnQtc2Vjb25kYXJ5OiAjZThlOWViO1xuICAtLWNvbG9yLWJhY2tncm91bmQtcHJpbWFyeTogIzMxMzYzODtcbiAgLS1jb2xvci1iYWNrZ3JvdW5kLXNlY29uZGFyeTogI2YwNjU0MztcbiAgLS1jb2xvci1iYWNrZ3JvdW5kLWRlZmF1bHQ6ICNmZmZmZmY7XG4gIC0tY29sb3ItYWNjZW50OiAjZjA5ZDUxO1xuICAtLWNvbG9yLWJveC1zaGFkb3c6ICMwMDAwMDA7XG4gIC0tZmxleC1nYXAtc21hbGw6IDAuNXJlbTtcbiAgLS1wYWRkaW5nLXNtYWxsLWJ0bjogMC41cmVtO1xuICAtLXBhZGRpbmctbWVkLWJ0bjogMXJlbTtcbiAgLS1wYWRkaW5nLWxhcmdlLWJ0bjogMnJlbTtcbiAgLS1ib3JkZXItcmFkaXVzLWJ0bjogMC41cmVtO1xufVxuXG4qLFxuKjo6YmVmb3JlLFxuKjo6YWZ0ZXIge1xuICBwYWRkaW5nOiAwO1xuICBtYXJnaW46IDA7XG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gIGZvbnQtc2l6ZTogMTZweDtcbn1cblxuYm9keSB7XG4gIG1pbi1oZWlnaHQ6IDEwMHN2aDtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE0OSwgMTE2LCA1OSk7XG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCcsIEFyaWFsO1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xuICBmb250LWZhbWlseTogQXJpYWw7XG59XG5cbiNiYXR0bGVzaGlwX2FwcCB7XG4gIG1pbi1oZWlnaHQ6IGluaGVyaXQ7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtcm93czogbWluLWNvbnRlbnQgMWZyO1xufVxuXG4jbWFpbl9jb250ZW50IHtcbiAgLyogVGVtcG9yYXJ5ICovXG4gIC8qIG1hcmdpbi10b3A6IDRlbTsgKi9cbn1cblxuI21haW5fY29udGVudCA+IDpmaXJzdC1jaGlsZCB7XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9hcHAuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsdURBQXVEO0VBQ3ZELCtCQUErQjtFQUMvQiw0Q0FBMkU7RUFDM0UsZ0JBQWdCO0VBQ2hCLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLDZCQUE2QjtFQUM3QiwrQkFBK0I7RUFDL0IsbUNBQW1DO0VBQ25DLHFDQUFxQztFQUNyQyxtQ0FBbUM7RUFDbkMsdUJBQXVCO0VBQ3ZCLDJCQUEyQjtFQUMzQix3QkFBd0I7RUFDeEIsMkJBQTJCO0VBQzNCLHVCQUF1QjtFQUN2Qix5QkFBeUI7RUFDekIsMkJBQTJCO0FBQzdCOztBQUVBOzs7RUFHRSxVQUFVO0VBQ1YsU0FBUztFQUNULHNCQUFzQjtFQUN0QixlQUFlO0FBQ2pCOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLG1DQUFtQztFQUNuQyxzQ0FBc0M7RUFDdEMsK0JBQStCO0VBQy9CLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLG1CQUFtQjtFQUNuQixhQUFhO0VBQ2IsbUNBQW1DO0FBQ3JDOztBQUVBO0VBQ0UsY0FBYztFQUNkLHFCQUFxQjtBQUN2Qjs7QUFFQTtFQUNFLFlBQVk7RUFDWixhQUFhO0VBQ2IsdUJBQXVCO0FBQ3pCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIkBmb250LWZhY2Uge1xcbiAgLyogaHR0cHM6Ly9mb250cy5nb29nbGUuY29tL3NwZWNpbWVuL1JvYm90bytDb25kZW5zZWQgKi9cXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XFxuICBzcmM6IHVybCguL2Fzc2V0cy9mb250cy9Sb2JvdG9fQ29uZGVuc2VkL3N0YXRpYy9Sb2JvdG9Db25kZW5zZWQtTWVkaXVtLnR0Zik7XFxuICBmb250LXdlaWdodDogNjAwO1xcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xcbn1cXG5cXG46cm9vdCB7XFxuICAtLWNvbG9yLWZvbnQtcHJpbWFyeTogIzAwMDAwMDtcXG4gIC0tY29sb3ItZm9udC1zZWNvbmRhcnk6ICNlOGU5ZWI7XFxuICAtLWNvbG9yLWJhY2tncm91bmQtcHJpbWFyeTogIzMxMzYzODtcXG4gIC0tY29sb3ItYmFja2dyb3VuZC1zZWNvbmRhcnk6ICNmMDY1NDM7XFxuICAtLWNvbG9yLWJhY2tncm91bmQtZGVmYXVsdDogI2ZmZmZmZjtcXG4gIC0tY29sb3ItYWNjZW50OiAjZjA5ZDUxO1xcbiAgLS1jb2xvci1ib3gtc2hhZG93OiAjMDAwMDAwO1xcbiAgLS1mbGV4LWdhcC1zbWFsbDogMC41cmVtO1xcbiAgLS1wYWRkaW5nLXNtYWxsLWJ0bjogMC41cmVtO1xcbiAgLS1wYWRkaW5nLW1lZC1idG46IDFyZW07XFxuICAtLXBhZGRpbmctbGFyZ2UtYnRuOiAycmVtO1xcbiAgLS1ib3JkZXItcmFkaXVzLWJ0bjogMC41cmVtO1xcbn1cXG5cXG4qLFxcbio6OmJlZm9yZSxcXG4qOjphZnRlciB7XFxuICBwYWRkaW5nOiAwO1xcbiAgbWFyZ2luOiAwO1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIGZvbnQtc2l6ZTogMTZweDtcXG59XFxuXFxuYm9keSB7XFxuICBtaW4taGVpZ2h0OiAxMDBzdmg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMTQ5LCAxMTYsIDU5KTtcXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCcsIEFyaWFsO1xcbiAgZm9udC1mYW1pbHk6ICdSb2JvdG8gQ29uZGVuc2VkJztcXG4gIGZvbnQtZmFtaWx5OiBBcmlhbDtcXG59XFxuXFxuI2JhdHRsZXNoaXBfYXBwIHtcXG4gIG1pbi1oZWlnaHQ6IGluaGVyaXQ7XFxuICBkaXNwbGF5OiBncmlkO1xcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBtaW4tY29udGVudCAxZnI7XFxufVxcblxcbiNtYWluX2NvbnRlbnQge1xcbiAgLyogVGVtcG9yYXJ5ICovXFxuICAvKiBtYXJnaW4tdG9wOiA0ZW07ICovXFxufVxcblxcbiNtYWluX2NvbnRlbnQgPiA6Zmlyc3QtY2hpbGQge1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNoZWFkZXIge1xuICBwYWRkaW5nOiAxZW0gMWVtIDNlbTtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE2NSwgMTY1LCAxNjUpO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL2hlYWRlci5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxvQkFBb0I7RUFDcEIsb0NBQW9DO0FBQ3RDXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNoZWFkZXIge1xcbiAgcGFkZGluZzogMWVtIDFlbSAzZW07XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMTY1LCAxNjUsIDE2NSk7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgI2hvbWUge1xufVxuXG4uZ2FtZW1vZGVfYnRucyB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBnYXA6IDJlbTtcbn1cblxuLmdhbWVtb2RlX2J0bnMgPiAqIHtcbiAgcGFkZGluZzogdmFyKC0tcGFkZGluZy1sYXJnZS1idG4pO1xuICBib3JkZXItcmFkaXVzOiB2YXIoLS1ib3JkZXItcmFkaXVzLWJ0bik7XG4gIGJvcmRlcjogbm9uZTtcbn1cblxuLmdhbWVtb2RlX2J0bnMgPiAqOmhvdmVyIHtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBib3gtc2hhZG93OiAwcmVtIDByZW0gMC41cmVtIDByZW0gYmxhY2s7XG59XG5cbi5nYW1lbW9kZV9idG5zID4gKjphY3RpdmUge1xuICBiYWNrZ3JvdW5kOiBibGFjaztcbiAgY29sb3I6IHdoaXRlO1xufVxuXG4uZ2FtZW1vZGVfYnRucyA+ICogPiBzcGFuIHtcbiAgZm9udC1zaXplOiAyZW07XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9zdHlsZXMvaG9tZS5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7QUFDQTs7QUFFQTtFQUNFLGFBQWE7RUFDYixzQkFBc0I7RUFDdEIsdUJBQXVCO0VBQ3ZCLFFBQVE7QUFDVjs7QUFFQTtFQUNFLGlDQUFpQztFQUNqQyx1Q0FBdUM7RUFDdkMsWUFBWTtBQUNkOztBQUVBO0VBQ0UsZUFBZTtFQUNmLHVDQUF1QztBQUN6Qzs7QUFFQTtFQUNFLGlCQUFpQjtFQUNqQixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxjQUFjO0FBQ2hCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNob21lIHtcXG59XFxuXFxuLmdhbWVtb2RlX2J0bnMge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG4gIGdhcDogMmVtO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICoge1xcbiAgcGFkZGluZzogdmFyKC0tcGFkZGluZy1sYXJnZS1idG4pO1xcbiAgYm9yZGVyLXJhZGl1czogdmFyKC0tYm9yZGVyLXJhZGl1cy1idG4pO1xcbiAgYm9yZGVyOiBub25lO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICo6aG92ZXIge1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgYm94LXNoYWRvdzogMHJlbSAwcmVtIDAuNXJlbSAwcmVtIGJsYWNrO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICo6YWN0aXZlIHtcXG4gIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgY29sb3I6IHdoaXRlO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICogPiBzcGFuIHtcXG4gIGZvbnQtc2l6ZTogMmVtO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNuYXZiYXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgei1pbmRleDogMTtcbn1cblxuI25hdmJhciA+ICoge1xuICBkaXNwbGF5OiBmbGV4O1xuICBsaXN0LXN0eWxlOiBub25lO1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBnYXA6IHZhcigtLWZsZXgtZ2FwLXNtYWxsKTtcbn1cblxuLm5hdl9yaWdodCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbn1cblxuLm5hdl9yaWdodCA+IDpsYXN0LWNoaWxkIHtcbiAgLyogRXhwZXJpbWVudGluZyAqL1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHJpZ2h0OiAwO1xuICB0b3A6IDIuNWVtO1xuICBwYWRkaW5nOiAxcmVtO1xufVxuXG4ubmF2X2l0ZW0ge1xuICBjb2xvcjogdmFyKC0tY29sb3ItZm9udC1wcmltYXJ5KTtcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xuICBmb250LXNpemU6IDEuMnJlbTtcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xufVxuXG4ubmF2X2l0ZW06bm90KC5naXRodWIpOmhvdmVyIHtcbiAgY29sb3I6IHdoaXRlO1xufVxuXG4ubmF2X2l0ZW0gPiBzdmcge1xuICBjb2xvcjogd2hpdGU7XG4gIHdpZHRoOiAyLjVyZW07XG4gIGhlaWdodDogYXV0bztcbn1cblxuLm5hdl9pdGVtID4gLmdpdGh1Yl9sb2dvOmhvdmVyIHtcbiAgY29sb3I6IHJnYigxNDksIDAsIDI1NSk7XG4gIGFuaW1hdGlvbjogbGluZWFyIDJzIGluZmluaXRlIHJvdGF0ZTtcbn1cblxuLm5hdl9pdGVtLm5hdl9sb2dvIHtcbiAgZGlzcGxheTogZmxleDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgZ2FwOiB2YXIoLS1mbGV4LWdhcC1zbWFsbCk7XG59XG5cbi5uYXZfaXRlbS5uYXZfbG9nbyA+IGgxIHtcbiAgZm9udC1zaXplOiAycmVtO1xufVxuXG4ubGVhdmVfZ2FtZS5pbmFjdGl2ZSB7XG4gIGRpc3BsYXk6IG5vbmU7XG59XG5cbkBrZXlmcmFtZXMgcm90YXRlIHtcbiAgMCUge1xuICAgIHRyYW5zZm9ybTogcm90YXRlKDBkZWcpO1xuICB9XG5cbiAgMTAwJSB7XG4gICAgdHJhbnNmb3JtOiByb3RhdGUoMzYwZGVnKTtcbiAgfVxufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL25hdmJhci5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxhQUFhO0VBQ2IsOEJBQThCO0VBQzlCLGtCQUFrQjtFQUNsQixVQUFVO0FBQ1o7O0FBRUE7RUFDRSxhQUFhO0VBQ2IsZ0JBQWdCO0VBQ2hCLG1CQUFtQjtFQUNuQiwwQkFBMEI7QUFDNUI7O0FBRUE7RUFDRSxrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsa0JBQWtCO0VBQ2xCLFFBQVE7RUFDUixVQUFVO0VBQ1YsYUFBYTtBQUNmOztBQUVBO0VBQ0UsZ0NBQWdDO0VBQ2hDLGtCQUFrQjtFQUNsQixpQkFBaUI7RUFDakIscUJBQXFCO0FBQ3ZCOztBQUVBO0VBQ0UsWUFBWTtBQUNkOztBQUVBO0VBQ0UsWUFBWTtFQUNaLGFBQWE7RUFDYixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSx1QkFBdUI7RUFDdkIsb0NBQW9DO0FBQ3RDOztBQUVBO0VBQ0UsYUFBYTtFQUNiLG1CQUFtQjtFQUNuQiwwQkFBMEI7QUFDNUI7O0FBRUE7RUFDRSxlQUFlO0FBQ2pCOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0U7SUFDRSx1QkFBdUI7RUFDekI7O0VBRUE7SUFDRSx5QkFBeUI7RUFDM0I7QUFDRlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjbmF2YmFyIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICB6LWluZGV4OiAxO1xcbn1cXG5cXG4jbmF2YmFyID4gKiB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICBnYXA6IHZhcigtLWZsZXgtZ2FwLXNtYWxsKTtcXG59XFxuXFxuLm5hdl9yaWdodCB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxufVxcblxcbi5uYXZfcmlnaHQgPiA6bGFzdC1jaGlsZCB7XFxuICAvKiBFeHBlcmltZW50aW5nICovXFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICByaWdodDogMDtcXG4gIHRvcDogMi41ZW07XFxuICBwYWRkaW5nOiAxcmVtO1xcbn1cXG5cXG4ubmF2X2l0ZW0ge1xcbiAgY29sb3I6IHZhcigtLWNvbG9yLWZvbnQtcHJpbWFyeSk7XFxuICBmb250LXN0eWxlOiBub3JtYWw7XFxuICBmb250LXNpemU6IDEuMnJlbTtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG59XFxuXFxuLm5hdl9pdGVtOm5vdCguZ2l0aHViKTpob3ZlciB7XFxuICBjb2xvcjogd2hpdGU7XFxufVxcblxcbi5uYXZfaXRlbSA+IHN2ZyB7XFxuICBjb2xvcjogd2hpdGU7XFxuICB3aWR0aDogMi41cmVtO1xcbiAgaGVpZ2h0OiBhdXRvO1xcbn1cXG5cXG4ubmF2X2l0ZW0gPiAuZ2l0aHViX2xvZ286aG92ZXIge1xcbiAgY29sb3I6IHJnYigxNDksIDAsIDI1NSk7XFxuICBhbmltYXRpb246IGxpbmVhciAycyBpbmZpbml0ZSByb3RhdGU7XFxufVxcblxcbi5uYXZfaXRlbS5uYXZfbG9nbyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG4gIGdhcDogdmFyKC0tZmxleC1nYXAtc21hbGwpO1xcbn1cXG5cXG4ubmF2X2l0ZW0ubmF2X2xvZ28gPiBoMSB7XFxuICBmb250LXNpemU6IDJyZW07XFxufVxcblxcbi5sZWF2ZV9nYW1lLmluYWN0aXZlIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcblxcbkBrZXlmcmFtZXMgcm90YXRlIHtcXG4gIDAlIHtcXG4gICAgdHJhbnNmb3JtOiByb3RhdGUoMGRlZyk7XFxuICB9XFxuXFxuICAxMDAlIHtcXG4gICAgdHJhbnNmb3JtOiByb3RhdGUoMzYwZGVnKTtcXG4gIH1cXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjbm90aWZpY2F0aW9uc19jb250YWluZXIge1xuICAvKiBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgKi9cblxuICB3aWR0aDogMTAwJTtcbiAgbGVmdDogMDtcbiAgdG9wOiAwO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG59XG5cbiNub3RpZmljYXRpb25zX2NvbnRhaW5lciA+IC5ub3RpZmljYXRpb25fd3JhcHBlciB7XG4gIC8qIHdpZHRoOiAzMCU7XG4gIHBhZGRpbmc6IDFyZW07ICovXG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBtYXJnaW46IDYwcHggYXV0bztcbiAgd2lkdGg6IDQwJTtcbiAgaGVpZ2h0OiBtYXgtY29udGVudDtcbiAgYmFja2dyb3VuZDogI2Y4ZjhmODtcbiAgcGFkZGluZzogMC41ZW07XG4gIHVzZXItc2VsZWN0OiBub25lO1xufVxuXG4jbm90aWZpY2F0aW9uc19jb250YWluZXIuZ2FtZW92ZXIge1xuICBoZWlnaHQ6IDEwMCU7XG4gIHotaW5kZXg6IDk5OTtcbiAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjUpO1xufVxuXG4jbm90aWZpY2F0aW9uc19jb250YWluZXIuZ2FtZW92ZXIgPiAubm90aWZpY2F0aW9uX3dyYXBwZXIge1xuICBwYWRkaW5nOiAxcmVtO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoOCwgMTk1LCA4KTtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgZ2FwOiAxcmVtO1xuICBhbmltYXRpb246IHNsaWRlSW5fdG9wIDUwMG1zIGVhc2Utb3V0O1xufVxuXG4ubm90aWZpY2F0aW9uX3dyYXBwZXIgPiAucGxheV9hZ2FpbiB7XG4gIGNvbG9yOiB2YXIoLS1jb2xvci1mb250LXByaW1hcnkpO1xuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gIHBhZGRpbmc6IHZhcigtLXBhZGRpbmctc21hbGwtYnRuKTtcbiAgYmFja2dyb3VuZC1jb2xvcjogbGlnaHRncmF5O1xuICB3aWR0aDogbWF4LWNvbnRlbnQ7XG4gIGJvcmRlci1yYWRpdXM6IHZhcigtLWJvcmRlci1yYWRpdXMtYnRuKTtcbn1cblxuLm5vdGlmaWNhdGlvbl93cmFwcGVyID4gLnBsYXlfYWdhaW46aG92ZXIge1xuICBib3gtc2hhZG93OiAwcmVtIDByZW0gMC4zcmVtIC0wLjFyZW0gYmxhY2s7XG4gIGJhY2tncm91bmQ6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC42KTtcbn1cblxuQGtleWZyYW1lcyBzbGlkZUluX3RvcCB7XG4gIGZyb20ge1xuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgtMjAwMHB4KTtcbiAgfVxuXG4gIHRvIHtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7XG4gIH1cbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9ub3RpZmljYXRpb25zLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFOzRCQUMwQjs7RUFFMUIsV0FBVztFQUNYLE9BQU87RUFDUCxNQUFNO0VBQ04sa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0U7a0JBQ2dCO0VBQ2hCLGFBQWE7RUFDYix1QkFBdUI7RUFDdkIsaUJBQWlCO0VBQ2pCLFVBQVU7RUFDVixtQkFBbUI7RUFDbkIsbUJBQW1CO0VBQ25CLGNBQWM7RUFDZCxpQkFBaUI7QUFDbkI7O0FBRUE7RUFDRSxZQUFZO0VBQ1osWUFBWTtFQUNaLG9DQUFvQztBQUN0Qzs7QUFFQTtFQUNFLGFBQWE7RUFDYixnQ0FBZ0M7RUFDaEMsc0JBQXNCO0VBQ3RCLFNBQVM7RUFDVCxxQ0FBcUM7QUFDdkM7O0FBRUE7RUFDRSxnQ0FBZ0M7RUFDaEMscUJBQXFCO0VBQ3JCLGlDQUFpQztFQUNqQywyQkFBMkI7RUFDM0Isa0JBQWtCO0VBQ2xCLHVDQUF1QztBQUN6Qzs7QUFFQTtFQUNFLDBDQUEwQztFQUMxQyxvQ0FBb0M7QUFDdEM7O0FBRUE7RUFDRTtJQUNFLDhCQUE4QjtFQUNoQzs7RUFFQTtJQUNFLHdCQUF3QjtFQUMxQjtBQUNGXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNub3RpZmljYXRpb25zX2NvbnRhaW5lciB7XFxuICAvKiBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7ICovXFxuXFxuICB3aWR0aDogMTAwJTtcXG4gIGxlZnQ6IDA7XFxuICB0b3A6IDA7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxufVxcblxcbiNub3RpZmljYXRpb25zX2NvbnRhaW5lciA+IC5ub3RpZmljYXRpb25fd3JhcHBlciB7XFxuICAvKiB3aWR0aDogMzAlO1xcbiAgcGFkZGluZzogMXJlbTsgKi9cXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG4gIG1hcmdpbjogNjBweCBhdXRvO1xcbiAgd2lkdGg6IDQwJTtcXG4gIGhlaWdodDogbWF4LWNvbnRlbnQ7XFxuICBiYWNrZ3JvdW5kOiAjZjhmOGY4O1xcbiAgcGFkZGluZzogMC41ZW07XFxuICB1c2VyLXNlbGVjdDogbm9uZTtcXG59XFxuXFxuI25vdGlmaWNhdGlvbnNfY29udGFpbmVyLmdhbWVvdmVyIHtcXG4gIGhlaWdodDogMTAwJTtcXG4gIHotaW5kZXg6IDk5OTtcXG4gIGJhY2tncm91bmQ6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC41KTtcXG59XFxuXFxuI25vdGlmaWNhdGlvbnNfY29udGFpbmVyLmdhbWVvdmVyID4gLm5vdGlmaWNhdGlvbl93cmFwcGVyIHtcXG4gIHBhZGRpbmc6IDFyZW07XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoOCwgMTk1LCA4KTtcXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuICBnYXA6IDFyZW07XFxuICBhbmltYXRpb246IHNsaWRlSW5fdG9wIDUwMG1zIGVhc2Utb3V0O1xcbn1cXG5cXG4ubm90aWZpY2F0aW9uX3dyYXBwZXIgPiAucGxheV9hZ2FpbiB7XFxuICBjb2xvcjogdmFyKC0tY29sb3ItZm9udC1wcmltYXJ5KTtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIHBhZGRpbmc6IHZhcigtLXBhZGRpbmctc21hbGwtYnRuKTtcXG4gIGJhY2tncm91bmQtY29sb3I6IGxpZ2h0Z3JheTtcXG4gIHdpZHRoOiBtYXgtY29udGVudDtcXG4gIGJvcmRlci1yYWRpdXM6IHZhcigtLWJvcmRlci1yYWRpdXMtYnRuKTtcXG59XFxuXFxuLm5vdGlmaWNhdGlvbl93cmFwcGVyID4gLnBsYXlfYWdhaW46aG92ZXIge1xcbiAgYm94LXNoYWRvdzogMHJlbSAwcmVtIDAuM3JlbSAtMC4xcmVtIGJsYWNrO1xcbiAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjYpO1xcbn1cXG5cXG5Aa2V5ZnJhbWVzIHNsaWRlSW5fdG9wIHtcXG4gIGZyb20ge1xcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTIwMDBweCk7XFxuICB9XFxuXFxuICB0byB7XFxuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTtcXG4gIH1cXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAucG9ydC5pbmFjdGl2ZSB7XG4gIGRpc3BsYXk6IG5vbmU7XG59XG5cbi5wb3J0X2xpbmVzIHtcbiAgZGlzcGxheTogZmxleDtcbn1cblxuLnBvcnRfc2hpcCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgYm9yZGVyOiAxcHggZG90dGVkICNiMmIyYjk7XG4gIG1hcmdpbjogMC41ZW07XG4gIGJveC1zaXppbmc6IGNvbnRlbnQtYm94O1xufVxuXG4uc2hpcF9ib3gge1xuICB6LWluZGV4OiAyO1xuICBsZWZ0OiAwO1xuICB0b3A6IDA7XG4gIGJvcmRlcjogMnB4IHNvbGlkICMwMGY7XG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMjU1LCAwLjA1KTtcbiAgcG9zaXRpb246IGFic29sdXRlICFpbXBvcnRhbnQ7XG4gIG1hcmdpbjogLTJweDtcbiAgYm94LXNpemluZzogY29udGVudC1ib3g7XG59XG5cbi5zaGlwX2JveDpob3ZlciB7XG4gIGN1cnNvcjogbW92ZTtcbn1cblxuLnNoaXBfYm94LmRyYWdnaW5nLnNoaXBfYm94X3RyYW5zcGFyZW50IHtcbiAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gIGJvcmRlcjogdHJhbnNwYXJlbnQ7XG59XG5cbi5zaGlwX2JveF9wbGFjZWhvbGRlciB7XG4gIGJvcmRlci1jb2xvcjogIzQwYmY0NDtcbiAgYmFja2dyb3VuZDogcmdiYSg2NCwgMTkxLCA2OCwgMC4wNSk7XG59XG5cbi5yb3RhdGVfZXJyb3Ige1xuICBib3JkZXItY29sb3I6IHJlZDtcbiAgYW5pbWF0aW9uOiBsaW5lYXIgMC4wMDVzIGluZmluaXRlIHNoYWtlO1xufVxuXG4uYnRuc19jb250YWluZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgbWFyZ2luLXRvcDogMXJlbTtcbiAgZ2FwOiAwLjI1cmVtO1xufVxuXG4uYnRuc19jb250YWluZXIgPiAqID4gYnV0dG9uIHtcbiAgcGFkZGluZzogMC41cmVtIDFyZW07XG59XG5cbi5idG5zX2NvbnRhaW5lciA+ICogPiBidXR0b246aG92ZXIge1xuICBjdXJzb3I6IHBvaW50ZXI7XG4gIGNvbG9yOiAjMDRhMjA0O1xufVxuXG4ucmVzZXRfYnRuLmluYWN0aXZlIHtcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG59XG5cbi5yZXNldF9idG4uaW5hY3RpdmUgPiBzcGFuIHtcbiAgb3BhY2l0eTogMC41O1xufVxuXG4ucmFuZG9tX2J0biB7XG4gIC8qIGRpc3BsYXk6IG5vbmU7ICovXG59XG5cbi5yZWFkeV9idG4uaW5hY3RpdmUge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG5Aa2V5ZnJhbWVzIHNoYWtlIHtcbiAgMCUge1xuICAgIGxlZnQ6IC01cHg7XG4gIH1cblxuICA1MCUge1xuICAgIGxlZnQ6IDBweDtcbiAgfVxuXG4gIDEwMCUge1xuICAgIGxlZnQ6IDVweDtcbiAgfVxufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL3BvcnQuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLDBCQUEwQjtFQUMxQixhQUFhO0VBQ2IsdUJBQXVCO0FBQ3pCOztBQUVBO0VBQ0UsVUFBVTtFQUNWLE9BQU87RUFDUCxNQUFNO0VBQ04sc0JBQXNCO0VBQ3RCLGlDQUFpQztFQUNqQyw2QkFBNkI7RUFDN0IsWUFBWTtFQUNaLHVCQUF1QjtBQUN6Qjs7QUFFQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLHVCQUF1QjtFQUN2QixtQkFBbUI7QUFDckI7O0FBRUE7RUFDRSxxQkFBcUI7RUFDckIsbUNBQW1DO0FBQ3JDOztBQUVBO0VBQ0UsaUJBQWlCO0VBQ2pCLHVDQUF1QztBQUN6Qzs7QUFFQTtFQUNFLGFBQWE7RUFDYix1QkFBdUI7RUFDdkIsZ0JBQWdCO0VBQ2hCLFlBQVk7QUFDZDs7QUFFQTtFQUNFLG9CQUFvQjtBQUN0Qjs7QUFFQTtFQUNFLGVBQWU7RUFDZixjQUFjO0FBQ2hCOztBQUVBO0VBQ0Usb0JBQW9CO0FBQ3RCOztBQUVBO0VBQ0UsWUFBWTtBQUNkOztBQUVBO0VBQ0UsbUJBQW1CO0FBQ3JCOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0U7SUFDRSxVQUFVO0VBQ1o7O0VBRUE7SUFDRSxTQUFTO0VBQ1g7O0VBRUE7SUFDRSxTQUFTO0VBQ1g7QUFDRlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIucG9ydC5pbmFjdGl2ZSB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG5cXG4ucG9ydF9saW5lcyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cXG4ucG9ydF9zaGlwIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGJvcmRlcjogMXB4IGRvdHRlZCAjYjJiMmI5O1xcbiAgbWFyZ2luOiAwLjVlbTtcXG4gIGJveC1zaXppbmc6IGNvbnRlbnQtYm94O1xcbn1cXG5cXG4uc2hpcF9ib3gge1xcbiAgei1pbmRleDogMjtcXG4gIGxlZnQ6IDA7XFxuICB0b3A6IDA7XFxuICBib3JkZXI6IDJweCBzb2xpZCAjMDBmO1xcbiAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAyNTUsIDAuMDUpO1xcbiAgcG9zaXRpb246IGFic29sdXRlICFpbXBvcnRhbnQ7XFxuICBtYXJnaW46IC0ycHg7XFxuICBib3gtc2l6aW5nOiBjb250ZW50LWJveDtcXG59XFxuXFxuLnNoaXBfYm94OmhvdmVyIHtcXG4gIGN1cnNvcjogbW92ZTtcXG59XFxuXFxuLnNoaXBfYm94LmRyYWdnaW5nLnNoaXBfYm94X3RyYW5zcGFyZW50IHtcXG4gIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyOiB0cmFuc3BhcmVudDtcXG59XFxuXFxuLnNoaXBfYm94X3BsYWNlaG9sZGVyIHtcXG4gIGJvcmRlci1jb2xvcjogIzQwYmY0NDtcXG4gIGJhY2tncm91bmQ6IHJnYmEoNjQsIDE5MSwgNjgsIDAuMDUpO1xcbn1cXG5cXG4ucm90YXRlX2Vycm9yIHtcXG4gIGJvcmRlci1jb2xvcjogcmVkO1xcbiAgYW5pbWF0aW9uOiBsaW5lYXIgMC4wMDVzIGluZmluaXRlIHNoYWtlO1xcbn1cXG5cXG4uYnRuc19jb250YWluZXIge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbiAgbWFyZ2luLXRvcDogMXJlbTtcXG4gIGdhcDogMC4yNXJlbTtcXG59XFxuXFxuLmJ0bnNfY29udGFpbmVyID4gKiA+IGJ1dHRvbiB7XFxuICBwYWRkaW5nOiAwLjVyZW0gMXJlbTtcXG59XFxuXFxuLmJ0bnNfY29udGFpbmVyID4gKiA+IGJ1dHRvbjpob3ZlciB7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBjb2xvcjogIzA0YTIwNDtcXG59XFxuXFxuLnJlc2V0X2J0bi5pbmFjdGl2ZSB7XFxuICBwb2ludGVyLWV2ZW50czogbm9uZTtcXG59XFxuXFxuLnJlc2V0X2J0bi5pbmFjdGl2ZSA+IHNwYW4ge1xcbiAgb3BhY2l0eTogMC41O1xcbn1cXG5cXG4ucmFuZG9tX2J0biB7XFxuICAvKiBkaXNwbGF5OiBub25lOyAqL1xcbn1cXG5cXG4ucmVhZHlfYnRuLmluYWN0aXZlIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcblxcbkBrZXlmcmFtZXMgc2hha2Uge1xcbiAgMCUge1xcbiAgICBsZWZ0OiAtNXB4O1xcbiAgfVxcblxcbiAgNTAlIHtcXG4gICAgbGVmdDogMHB4O1xcbiAgfVxcblxcbiAgMTAwJSB7XFxuICAgIGxlZnQ6IDVweDtcXG4gIH1cXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjYm9hcmRzX2NvbnRhaW5lciB7XG4gIG1hcmdpbi10b3A6IDRlbTtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIGZsZXgtd3JhcDogd3JhcDtcbiAgZ2FwOiA4cmVtO1xuICB1c2VyLXNlbGVjdDogbm9uZTtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqIHtcbiAgaGVpZ2h0OiBtaW4tY29udGVudDtcbn1cblxuLmJvYXJkID4gKiB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICoud2FpdCA+ICo6bm90KC5nYW1lX3BsYXkpIHtcbiAgb3BhY2l0eTogMC40O1xuICBwb2ludGVyLWV2ZW50czogbm9uZTtcbn1cblxuI2JvYXJkc19jb250YWluZXIuYnVzeSA+ICo6bm90KC53YWl0KSA+ICogPiAqID4gKiA+ICogPiAuc2hpcF9ib3gge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lci5idXN5ID4gKiA+ICogPiAqID4gLmNlbGw6bm90KC5oaXQpOm5vdCgubWlzcyk6aG92ZXIge1xuICBib3JkZXItY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTtcbn1cblxuI2JvYXJkc19jb250YWluZXIuYnVzeSA+ICogPiAqID4gKiA+IC5jZWxsOm5vdCguaGl0KTpub3QoLm1pc3MpOmhvdmVyID4gLmNlbGxfY29udGVudDo6YWZ0ZXIge1xuICBib3JkZXI6IDJweCBzb2xpZCAjNDBiZjQ0O1xuICBiYWNrZ3JvdW5kOiByZ2JhKDY0LCAxOTEsIDY4LCAwLjA1KTtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB3aWR0aDogMmVtO1xuICBoZWlnaHQ6IDJlbTtcbiAgcGFkZGluZzogMWVtO1xuICB0b3A6IDBweDtcbiAgbGVmdDogMDtcbiAgbWFyZ2luOiAtMnB4O1xuICBjb250ZW50OiAnJztcbiAgZGlzcGxheTogYmxvY2s7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgei1pbmRleDogMjtcbn1cblxuLnBsYXllcl90d28uaW5hY3RpdmUge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4ucGxheWVyX3R3byB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbn1cblxuLmNlbGwge1xuICBib3JkZXI6IDFweCBzb2xpZCAjYjRiNGZmO1xuICBwYWRkaW5nOiAwO1xufVxuXG4uY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXI6OmJlZm9yZSxcbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YWZ0ZXIge1xuICBjb250ZW50OiAnJztcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBiYWNrZ3JvdW5kOiByZWQ7XG59XG5cbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YmVmb3JlIHtcbiAgbGVmdDogNTAlO1xuICB3aWR0aDogMnB4O1xuICB0b3A6IC0yNSU7XG4gIGhlaWdodDogMTUwJTtcbiAgbWFyZ2luLXRvcDogMXB4O1xufVxuXG4uY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXI6OmFmdGVyIHtcbiAgdG9wOiA1MCU7XG4gIGhlaWdodDogMnB4O1xuICBsZWZ0OiAtMjUlO1xuICB3aWR0aDogMTUwJTtcbiAgbWFyZ2luLWxlZnQ6IC0xcHg7XG59XG5cbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YmVmb3JlLFxuLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyOjphZnRlciB7XG4gIHRyYW5zZm9ybTogcm90YXRlKC00NWRlZyk7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKiA+ICogPiAqID4gLmhpdC5kb25lID4gKiA+IC5zaGlwX2JveCB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICBib3JkZXItY29sb3I6IHJlZDtcbn1cblxuLmhpdC5kb25lIHtcbiAgYm9yZGVyOiAxcHggc29saWQgcmVkO1xufVxuXG4uY2VsbC5kb25lID4gLmNlbGxfY29udGVudCA+IC5zaGlwX2JveCB7XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAwLCAwLCAwLjA1KTtcbn1cblxuLmNlbGwubWlzcyA+IC5jZWxsX2NvbnRlbnQge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcbn1cblxuLmNlbGwubWlzcyA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YWZ0ZXIge1xuICBjb250ZW50OiAnJztcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDUwJTtcbiAgbGVmdDogNTAlO1xuICBoZWlnaHQ6IDRweDtcbiAgd2lkdGg6IDRweDtcbiAgYmFja2dyb3VuZDogIzMzMztcbiAgYm9yZGVyLXJhZGl1czogNTAlO1xuICBtYXJnaW4tdG9wOiAtMnB4O1xuICBtYXJnaW4tbGVmdDogLTJweDtcbn1cblxuLmNlbGwubWlzcyA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlciB7XG4gIGNvbnRlbnQ6ICcnO1xuICBkaXNwbGF5OiBibG9jaztcbiAgaGVpZ2h0OiAyZW07XG4gIHdpZHRoOiAyZW07XG4gIGJhY2tncm91bmQtY29sb3I6ICNmYWZhZDI7XG59XG5cbi5jZWxsX2NvbnRlbnQge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGhlaWdodDogMmVtO1xuICB3aWR0aDogMmVtO1xufVxuXG4ubWFya2VyX3JvdyB7XG4gIGxlZnQ6IC0zZW07XG4gIHdpZHRoOiAyZW07XG4gIHRleHQtYWxpZ246IHJpZ2h0O1xuICB0b3A6IDFlbTtcbiAgaGVpZ2h0OiAxZW07XG59XG5cbi5tYXJrZXJfY29sIHtcbiAgdG9wOiAtMmVtO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xufVxuXG4ubWFya2VyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBmb250LXNpemU6IDExcHg7XG4gIHotaW5kZXg6IC0xO1xufVxuXG4uZ2FtZV9wbGF5IHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAxMCU7XG4gIGxlZnQ6IDEwJTtcbn1cblxuLmdhbWVfcGxheSA+IC5wbGF5X2J0bi5pbmFjdGl2ZSB7XG4gIGRpc3BsYXk6IG5vbmU7XG59XG5cbi5nYW1lX3BsYXkgPiAucGxheV9idG4ge1xuICBwYWRkaW5nOiAwLjVyZW0gMXJlbTtcbiAgYm94LXNoYWRvdzogMHB4IDJweCA1cHggLTJweCBibGFjaztcbn1cblxuLmdhbWVfcGxheSA+IC5wbGF5X2J0bjpob3ZlciB7XG4gIGN1cnNvcjogcG9pbnRlcjtcbn1cblxuQG1lZGlhIHNjcmVlbiBhbmQgKG1pbi13aWR0aDogNzY4cHgpIHtcbiAgI2JvYXJkc19jb250YWluZXIge1xuICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XG4gIH1cbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGVBQWU7RUFDZixhQUFhO0VBQ2Isc0JBQXNCO0VBQ3RCLHVCQUF1QjtFQUN2QixlQUFlO0VBQ2YsU0FBUztFQUNULGlCQUFpQjtBQUNuQjs7QUFFQTtFQUNFLG1CQUFtQjtBQUNyQjs7QUFFQTtFQUNFLGFBQWE7RUFDYix1QkFBdUI7QUFDekI7O0FBRUE7RUFDRSxZQUFZO0VBQ1osb0JBQW9CO0FBQ3RCOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0Usc0NBQXNDO0FBQ3hDOztBQUVBO0VBQ0UseUJBQXlCO0VBQ3pCLG1DQUFtQztFQUNuQyxrQkFBa0I7RUFDbEIsVUFBVTtFQUNWLFdBQVc7RUFDWCxZQUFZO0VBQ1osUUFBUTtFQUNSLE9BQU87RUFDUCxZQUFZO0VBQ1osV0FBVztFQUNYLGNBQWM7RUFDZCxlQUFlO0VBQ2YsVUFBVTtBQUNaOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0Usa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0UseUJBQXlCO0VBQ3pCLFVBQVU7QUFDWjs7QUFFQTs7RUFFRSxXQUFXO0VBQ1gsa0JBQWtCO0VBQ2xCLGVBQWU7QUFDakI7O0FBRUE7RUFDRSxTQUFTO0VBQ1QsVUFBVTtFQUNWLFNBQVM7RUFDVCxZQUFZO0VBQ1osZUFBZTtBQUNqQjs7QUFFQTtFQUNFLFFBQVE7RUFDUixXQUFXO0VBQ1gsVUFBVTtFQUNWLFdBQVc7RUFDWCxpQkFBaUI7QUFDbkI7O0FBRUE7O0VBRUUseUJBQXlCO0FBQzNCOztBQUVBO0VBQ0UsY0FBYztFQUNkLGlCQUFpQjtBQUNuQjs7QUFFQTtFQUNFLHFCQUFxQjtBQUN2Qjs7QUFFQTtFQUNFLHVDQUF1QztBQUN6Qzs7QUFFQTtFQUNFLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFLFdBQVc7RUFDWCxrQkFBa0I7RUFDbEIsUUFBUTtFQUNSLFNBQVM7RUFDVCxXQUFXO0VBQ1gsVUFBVTtFQUNWLGdCQUFnQjtFQUNoQixrQkFBa0I7RUFDbEIsZ0JBQWdCO0VBQ2hCLGlCQUFpQjtBQUNuQjs7QUFFQTtFQUNFLFdBQVc7RUFDWCxjQUFjO0VBQ2QsV0FBVztFQUNYLFVBQVU7RUFDVix5QkFBeUI7QUFDM0I7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsV0FBVztFQUNYLFVBQVU7QUFDWjs7QUFFQTtFQUNFLFVBQVU7RUFDVixVQUFVO0VBQ1YsaUJBQWlCO0VBQ2pCLFFBQVE7RUFDUixXQUFXO0FBQ2I7O0FBRUE7RUFDRSxTQUFTO0VBQ1QsT0FBTztFQUNQLFdBQVc7RUFDWCxrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsZUFBZTtFQUNmLFdBQVc7QUFDYjs7QUFFQTtFQUNFLGNBQWM7RUFDZCxrQkFBa0I7RUFDbEIsUUFBUTtFQUNSLFNBQVM7QUFDWDs7QUFFQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLG9CQUFvQjtFQUNwQixrQ0FBa0M7QUFDcEM7O0FBRUE7RUFDRSxlQUFlO0FBQ2pCOztBQUVBO0VBQ0U7SUFDRSxtQkFBbUI7RUFDckI7QUFDRlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjYm9hcmRzX2NvbnRhaW5lciB7XFxuICBtYXJnaW4tdG9wOiA0ZW07XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbiAgZmxleC13cmFwOiB3cmFwO1xcbiAgZ2FwOiA4cmVtO1xcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiB7XFxuICBoZWlnaHQ6IG1pbi1jb250ZW50O1xcbn1cXG5cXG4uYm9hcmQgPiAqIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqLndhaXQgPiAqOm5vdCguZ2FtZV9wbGF5KSB7XFxuICBvcGFjaXR5OiAwLjQ7XFxuICBwb2ludGVyLWV2ZW50czogbm9uZTtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIuYnVzeSA+ICo6bm90KC53YWl0KSA+ICogPiAqID4gKiA+ICogPiAuc2hpcF9ib3gge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIuYnVzeSA+ICogPiAqID4gKiA+IC5jZWxsOm5vdCguaGl0KTpub3QoLm1pc3MpOmhvdmVyIHtcXG4gIGJvcmRlci1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lci5idXN5ID4gKiA+ICogPiAqID4gLmNlbGw6bm90KC5oaXQpOm5vdCgubWlzcyk6aG92ZXIgPiAuY2VsbF9jb250ZW50OjphZnRlciB7XFxuICBib3JkZXI6IDJweCBzb2xpZCAjNDBiZjQ0O1xcbiAgYmFja2dyb3VuZDogcmdiYSg2NCwgMTkxLCA2OCwgMC4wNSk7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB3aWR0aDogMmVtO1xcbiAgaGVpZ2h0OiAyZW07XFxuICBwYWRkaW5nOiAxZW07XFxuICB0b3A6IDBweDtcXG4gIGxlZnQ6IDA7XFxuICBtYXJnaW46IC0ycHg7XFxuICBjb250ZW50OiAnJztcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgei1pbmRleDogMjtcXG59XFxuXFxuLnBsYXllcl90d28uaW5hY3RpdmUge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuXFxuLnBsYXllcl90d28ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG5cXG4uY2VsbCB7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjYjRiNGZmO1xcbiAgcGFkZGluZzogMDtcXG59XFxuXFxuLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyOjpiZWZvcmUsXFxuLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyOjphZnRlciB7XFxuICBjb250ZW50OiAnJztcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGJhY2tncm91bmQ6IHJlZDtcXG59XFxuXFxuLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyOjpiZWZvcmUge1xcbiAgbGVmdDogNTAlO1xcbiAgd2lkdGg6IDJweDtcXG4gIHRvcDogLTI1JTtcXG4gIGhlaWdodDogMTUwJTtcXG4gIG1hcmdpbi10b3A6IDFweDtcXG59XFxuXFxuLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyOjphZnRlciB7XFxuICB0b3A6IDUwJTtcXG4gIGhlaWdodDogMnB4O1xcbiAgbGVmdDogLTI1JTtcXG4gIHdpZHRoOiAxNTAlO1xcbiAgbWFyZ2luLWxlZnQ6IC0xcHg7XFxufVxcblxcbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YmVmb3JlLFxcbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YWZ0ZXIge1xcbiAgdHJhbnNmb3JtOiByb3RhdGUoLTQ1ZGVnKTtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gKiA+ICogPiAuaGl0LmRvbmUgPiAqID4gLnNoaXBfYm94IHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgYm9yZGVyLWNvbG9yOiByZWQ7XFxufVxcblxcbi5oaXQuZG9uZSB7XFxuICBib3JkZXI6IDFweCBzb2xpZCByZWQ7XFxufVxcblxcbi5jZWxsLmRvbmUgPiAuY2VsbF9jb250ZW50ID4gLnNoaXBfYm94IHtcXG4gIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAwLCAwLCAwLjA1KTtcXG59XFxuXFxuLmNlbGwubWlzcyA+IC5jZWxsX2NvbnRlbnQge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcblxcbi5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXI6OmFmdGVyIHtcXG4gIGNvbnRlbnQ6ICcnO1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiA1MCU7XFxuICBsZWZ0OiA1MCU7XFxuICBoZWlnaHQ6IDRweDtcXG4gIHdpZHRoOiA0cHg7XFxuICBiYWNrZ3JvdW5kOiAjMzMzO1xcbiAgYm9yZGVyLXJhZGl1czogNTAlO1xcbiAgbWFyZ2luLXRvcDogLTJweDtcXG4gIG1hcmdpbi1sZWZ0OiAtMnB4O1xcbn1cXG5cXG4uY2VsbC5taXNzID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyIHtcXG4gIGNvbnRlbnQ6ICcnO1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBoZWlnaHQ6IDJlbTtcXG4gIHdpZHRoOiAyZW07XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmFmYWQyO1xcbn1cXG5cXG4uY2VsbF9jb250ZW50IHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGhlaWdodDogMmVtO1xcbiAgd2lkdGg6IDJlbTtcXG59XFxuXFxuLm1hcmtlcl9yb3cge1xcbiAgbGVmdDogLTNlbTtcXG4gIHdpZHRoOiAyZW07XFxuICB0ZXh0LWFsaWduOiByaWdodDtcXG4gIHRvcDogMWVtO1xcbiAgaGVpZ2h0OiAxZW07XFxufVxcblxcbi5tYXJrZXJfY29sIHtcXG4gIHRvcDogLTJlbTtcXG4gIGxlZnQ6IDA7XFxuICB3aWR0aDogMTAwJTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG59XFxuXFxuLm1hcmtlciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBmb250LXNpemU6IDExcHg7XFxuICB6LWluZGV4OiAtMTtcXG59XFxuXFxuLmdhbWVfcGxheSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMTAlO1xcbiAgbGVmdDogMTAlO1xcbn1cXG5cXG4uZ2FtZV9wbGF5ID4gLnBsYXlfYnRuLmluYWN0aXZlIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcblxcbi5nYW1lX3BsYXkgPiAucGxheV9idG4ge1xcbiAgcGFkZGluZzogMC41cmVtIDFyZW07XFxuICBib3gtc2hhZG93OiAwcHggMnB4IDVweCAtMnB4IGJsYWNrO1xcbn1cXG5cXG4uZ2FtZV9wbGF5ID4gLnBsYXlfYnRuOmhvdmVyIHtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuXFxuQG1lZGlhIHNjcmVlbiBhbmQgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gICNib2FyZHNfY29udGFpbmVyIHtcXG4gICAgZmxleC1kaXJlY3Rpb246IHJvdztcXG4gIH1cXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICBNSVQgTGljZW5zZSBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuICBBdXRob3IgVG9iaWFzIEtvcHBlcnMgQHNva3JhXG4qL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3NzV2l0aE1hcHBpbmdUb1N0cmluZykge1xuICB2YXIgbGlzdCA9IFtdO1xuXG4gIC8vIHJldHVybiB0aGUgbGlzdCBvZiBtb2R1bGVzIGFzIGNzcyBzdHJpbmdcbiAgbGlzdC50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgdmFyIGNvbnRlbnQgPSBcIlwiO1xuICAgICAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBpdGVtWzVdICE9PSBcInVuZGVmaW5lZFwiO1xuICAgICAgaWYgKGl0ZW1bNF0pIHtcbiAgICAgICAgY29udGVudCArPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KGl0ZW1bNF0sIFwiKSB7XCIpO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bMl0pIHtcbiAgICAgICAgY29udGVudCArPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKTtcbiAgICAgIH1cbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpO1xuICAgICAgfVxuICAgICAgY29udGVudCArPSBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0pO1xuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bMl0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzRdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29udGVudDtcbiAgICB9KS5qb2luKFwiXCIpO1xuICB9O1xuXG4gIC8vIGltcG9ydCBhIGxpc3Qgb2YgbW9kdWxlcyBpbnRvIHRoZSBsaXN0XG4gIGxpc3QuaSA9IGZ1bmN0aW9uIGkobW9kdWxlcywgbWVkaWEsIGRlZHVwZSwgc3VwcG9ydHMsIGxheWVyKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGVzID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBtb2R1bGVzID0gW1tudWxsLCBtb2R1bGVzLCB1bmRlZmluZWRdXTtcbiAgICB9XG4gICAgdmFyIGFscmVhZHlJbXBvcnRlZE1vZHVsZXMgPSB7fTtcbiAgICBpZiAoZGVkdXBlKSB7XG4gICAgICBmb3IgKHZhciBrID0gMDsgayA8IHRoaXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgdmFyIGlkID0gdGhpc1trXVswXTtcbiAgICAgICAgaWYgKGlkICE9IG51bGwpIHtcbiAgICAgICAgICBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2lkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgX2sgPSAwOyBfayA8IG1vZHVsZXMubGVuZ3RoOyBfaysrKSB7XG4gICAgICB2YXIgaXRlbSA9IFtdLmNvbmNhdChtb2R1bGVzW19rXSk7XG4gICAgICBpZiAoZGVkdXBlICYmIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaXRlbVswXV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGxheWVyICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaXRlbVs1XSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgIGl0ZW1bNV0gPSBsYXllcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAbGF5ZXJcIi5jb25jYXQoaXRlbVs1XS5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KGl0ZW1bNV0pIDogXCJcIiwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNV0gPSBsYXllcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1lZGlhKSB7XG4gICAgICAgIGlmICghaXRlbVsyXSkge1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAbWVkaWEgXCIuY29uY2F0KGl0ZW1bMl0sIFwiIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzJdID0gbWVkaWE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzdXBwb3J0cykge1xuICAgICAgICBpZiAoIWl0ZW1bNF0pIHtcbiAgICAgICAgICBpdGVtWzRdID0gXCJcIi5jb25jYXQoc3VwcG9ydHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KGl0ZW1bNF0sIFwiKSB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs0XSA9IHN1cHBvcnRzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsaXN0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gbGlzdDtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgaWYgKCF1cmwpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG4gIHVybCA9IFN0cmluZyh1cmwuX19lc01vZHVsZSA/IHVybC5kZWZhdWx0IDogdXJsKTtcblxuICAvLyBJZiB1cmwgaXMgYWxyZWFkeSB3cmFwcGVkIGluIHF1b3RlcywgcmVtb3ZlIHRoZW1cbiAgaWYgKC9eWydcIl0uKlsnXCJdJC8udGVzdCh1cmwpKSB7XG4gICAgdXJsID0gdXJsLnNsaWNlKDEsIC0xKTtcbiAgfVxuICBpZiAob3B0aW9ucy5oYXNoKSB7XG4gICAgdXJsICs9IG9wdGlvbnMuaGFzaDtcbiAgfVxuXG4gIC8vIFNob3VsZCB1cmwgYmUgd3JhcHBlZD9cbiAgLy8gU2VlIGh0dHBzOi8vZHJhZnRzLmNzc3dnLm9yZy9jc3MtdmFsdWVzLTMvI3VybHNcbiAgaWYgKC9bXCInKCkgXFx0XFxuXXwoJTIwKS8udGVzdCh1cmwpIHx8IG9wdGlvbnMubmVlZFF1b3Rlcykge1xuICAgIHJldHVybiBcIlxcXCJcIi5jb25jYXQodXJsLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgXCJcXFxcblwiKSwgXCJcXFwiXCIpO1xuICB9XG4gIHJldHVybiB1cmw7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gIHZhciBjb250ZW50ID0gaXRlbVsxXTtcbiAgdmFyIGNzc01hcHBpbmcgPSBpdGVtWzNdO1xuICBpZiAoIWNzc01hcHBpbmcpIHtcbiAgICByZXR1cm4gY29udGVudDtcbiAgfVxuICBpZiAodHlwZW9mIGJ0b2EgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHZhciBiYXNlNjQgPSBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShjc3NNYXBwaW5nKSkpKTtcbiAgICB2YXIgZGF0YSA9IFwic291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsXCIuY29uY2F0KGJhc2U2NCk7XG4gICAgdmFyIHNvdXJjZU1hcHBpbmcgPSBcIi8qIyBcIi5jb25jYXQoZGF0YSwgXCIgKi9cIik7XG4gICAgcmV0dXJuIFtjb250ZW50XS5jb25jYXQoW3NvdXJjZU1hcHBpbmddKS5qb2luKFwiXFxuXCIpO1xuICB9XG4gIHJldHVybiBbY29udGVudF0uam9pbihcIlxcblwiKTtcbn07IiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2FwcC5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2FwcC5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaGVhZGVyLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaGVhZGVyLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ob21lLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaG9tZS5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vbmF2YmFyLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vbmF2YmFyLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ub3RpZmljYXRpb25zLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vbm90aWZpY2F0aW9ucy5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vcG9ydC5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3BvcnQuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3NjcmVlbkNvbnRyb2xsZXIuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9zY3JlZW5Db250cm9sbGVyLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3R5bGVzSW5ET00gPSBbXTtcbmZ1bmN0aW9uIGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpIHtcbiAgdmFyIHJlc3VsdCA9IC0xO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0eWxlc0luRE9NLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHN0eWxlc0luRE9NW2ldLmlkZW50aWZpZXIgPT09IGlkZW50aWZpZXIpIHtcbiAgICAgIHJlc3VsdCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKSB7XG4gIHZhciBpZENvdW50TWFwID0ge307XG4gIHZhciBpZGVudGlmaWVycyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV07XG4gICAgdmFyIGlkID0gb3B0aW9ucy5iYXNlID8gaXRlbVswXSArIG9wdGlvbnMuYmFzZSA6IGl0ZW1bMF07XG4gICAgdmFyIGNvdW50ID0gaWRDb3VudE1hcFtpZF0gfHwgMDtcbiAgICB2YXIgaWRlbnRpZmllciA9IFwiXCIuY29uY2F0KGlkLCBcIiBcIikuY29uY2F0KGNvdW50KTtcbiAgICBpZENvdW50TWFwW2lkXSA9IGNvdW50ICsgMTtcbiAgICB2YXIgaW5kZXhCeUlkZW50aWZpZXIgPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICB2YXIgb2JqID0ge1xuICAgICAgY3NzOiBpdGVtWzFdLFxuICAgICAgbWVkaWE6IGl0ZW1bMl0sXG4gICAgICBzb3VyY2VNYXA6IGl0ZW1bM10sXG4gICAgICBzdXBwb3J0czogaXRlbVs0XSxcbiAgICAgIGxheWVyOiBpdGVtWzVdXG4gICAgfTtcbiAgICBpZiAoaW5kZXhCeUlkZW50aWZpZXIgIT09IC0xKSB7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0ucmVmZXJlbmNlcysrO1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhCeUlkZW50aWZpZXJdLnVwZGF0ZXIob2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHVwZGF0ZXIgPSBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKTtcbiAgICAgIG9wdGlvbnMuYnlJbmRleCA9IGk7XG4gICAgICBzdHlsZXNJbkRPTS5zcGxpY2UoaSwgMCwge1xuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICB1cGRhdGVyOiB1cGRhdGVyLFxuICAgICAgICByZWZlcmVuY2VzOiAxXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWRlbnRpZmllcnMucHVzaChpZGVudGlmaWVyKTtcbiAgfVxuICByZXR1cm4gaWRlbnRpZmllcnM7XG59XG5mdW5jdGlvbiBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKSB7XG4gIHZhciBhcGkgPSBvcHRpb25zLmRvbUFQSShvcHRpb25zKTtcbiAgYXBpLnVwZGF0ZShvYmopO1xuICB2YXIgdXBkYXRlciA9IGZ1bmN0aW9uIHVwZGF0ZXIobmV3T2JqKSB7XG4gICAgaWYgKG5ld09iaikge1xuICAgICAgaWYgKG5ld09iai5jc3MgPT09IG9iai5jc3MgJiYgbmV3T2JqLm1lZGlhID09PSBvYmoubWVkaWEgJiYgbmV3T2JqLnNvdXJjZU1hcCA9PT0gb2JqLnNvdXJjZU1hcCAmJiBuZXdPYmouc3VwcG9ydHMgPT09IG9iai5zdXBwb3J0cyAmJiBuZXdPYmoubGF5ZXIgPT09IG9iai5sYXllcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhcGkudXBkYXRlKG9iaiA9IG5ld09iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwaS5yZW1vdmUoKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiB1cGRhdGVyO1xufVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobGlzdCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgbGlzdCA9IGxpc3QgfHwgW107XG4gIHZhciBsYXN0SWRlbnRpZmllcnMgPSBtb2R1bGVzVG9Eb20obGlzdCwgb3B0aW9ucyk7XG4gIHJldHVybiBmdW5jdGlvbiB1cGRhdGUobmV3TGlzdCkge1xuICAgIG5ld0xpc3QgPSBuZXdMaXN0IHx8IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFzdElkZW50aWZpZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaWRlbnRpZmllciA9IGxhc3RJZGVudGlmaWVyc1tpXTtcbiAgICAgIHZhciBpbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhdLnJlZmVyZW5jZXMtLTtcbiAgICB9XG4gICAgdmFyIG5ld0xhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShuZXdMaXN0LCBvcHRpb25zKTtcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgbGFzdElkZW50aWZpZXJzLmxlbmd0aDsgX2krKykge1xuICAgICAgdmFyIF9pZGVudGlmaWVyID0gbGFzdElkZW50aWZpZXJzW19pXTtcbiAgICAgIHZhciBfaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihfaWRlbnRpZmllcik7XG4gICAgICBpZiAoc3R5bGVzSW5ET01bX2luZGV4XS5yZWZlcmVuY2VzID09PSAwKSB7XG4gICAgICAgIHN0eWxlc0luRE9NW19pbmRleF0udXBkYXRlcigpO1xuICAgICAgICBzdHlsZXNJbkRPTS5zcGxpY2UoX2luZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbGFzdElkZW50aWZpZXJzID0gbmV3TGFzdElkZW50aWZpZXJzO1xuICB9O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG1lbW8gPSB7fTtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBnZXRUYXJnZXQodGFyZ2V0KSB7XG4gIGlmICh0eXBlb2YgbWVtb1t0YXJnZXRdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIHN0eWxlVGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXQpO1xuXG4gICAgLy8gU3BlY2lhbCBjYXNlIHRvIHJldHVybiBoZWFkIG9mIGlmcmFtZSBpbnN0ZWFkIG9mIGlmcmFtZSBpdHNlbGZcbiAgICBpZiAod2luZG93LkhUTUxJRnJhbWVFbGVtZW50ICYmIHN0eWxlVGFyZ2V0IGluc3RhbmNlb2Ygd2luZG93LkhUTUxJRnJhbWVFbGVtZW50KSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBUaGlzIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGFjY2VzcyB0byBpZnJhbWUgaXMgYmxvY2tlZFxuICAgICAgICAvLyBkdWUgdG8gY3Jvc3Mtb3JpZ2luIHJlc3RyaWN0aW9uc1xuICAgICAgICBzdHlsZVRhcmdldCA9IHN0eWxlVGFyZ2V0LmNvbnRlbnREb2N1bWVudC5oZWFkO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBpc3RhbmJ1bCBpZ25vcmUgbmV4dFxuICAgICAgICBzdHlsZVRhcmdldCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIG1lbW9bdGFyZ2V0XSA9IHN0eWxlVGFyZ2V0O1xuICB9XG4gIHJldHVybiBtZW1vW3RhcmdldF07XG59XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gaW5zZXJ0QnlTZWxlY3RvcihpbnNlcnQsIHN0eWxlKSB7XG4gIHZhciB0YXJnZXQgPSBnZXRUYXJnZXQoaW5zZXJ0KTtcbiAgaWYgKCF0YXJnZXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZG4ndCBmaW5kIGEgc3R5bGUgdGFyZ2V0LiBUaGlzIHByb2JhYmx5IG1lYW5zIHRoYXQgdGhlIHZhbHVlIGZvciB0aGUgJ2luc2VydCcgcGFyYW1ldGVyIGlzIGludmFsaWQuXCIpO1xuICB9XG4gIHRhcmdldC5hcHBlbmRDaGlsZChzdHlsZSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGluc2VydEJ5U2VsZWN0b3I7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gIG9wdGlvbnMuc2V0QXR0cmlidXRlcyhlbGVtZW50LCBvcHRpb25zLmF0dHJpYnV0ZXMpO1xuICBvcHRpb25zLmluc2VydChlbGVtZW50LCBvcHRpb25zLm9wdGlvbnMpO1xuICByZXR1cm4gZWxlbWVudDtcbn1cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0U3R5bGVFbGVtZW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcyhzdHlsZUVsZW1lbnQpIHtcbiAgdmFyIG5vbmNlID0gdHlwZW9mIF9fd2VicGFja19ub25jZV9fICE9PSBcInVuZGVmaW5lZFwiID8gX193ZWJwYWNrX25vbmNlX18gOiBudWxsO1xuICBpZiAobm9uY2UpIHtcbiAgICBzdHlsZUVsZW1lbnQuc2V0QXR0cmlidXRlKFwibm9uY2VcIiwgbm9uY2UpO1xuICB9XG59XG5tb2R1bGUuZXhwb3J0cyA9IHNldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlczsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBhcHBseShzdHlsZUVsZW1lbnQsIG9wdGlvbnMsIG9iaikge1xuICB2YXIgY3NzID0gXCJcIjtcbiAgaWYgKG9iai5zdXBwb3J0cykge1xuICAgIGNzcyArPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KG9iai5zdXBwb3J0cywgXCIpIHtcIik7XG4gIH1cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIkBtZWRpYSBcIi5jb25jYXQob2JqLm1lZGlhLCBcIiB7XCIpO1xuICB9XG4gIHZhciBuZWVkTGF5ZXIgPSB0eXBlb2Ygb2JqLmxheWVyICE9PSBcInVuZGVmaW5lZFwiO1xuICBpZiAobmVlZExheWVyKSB7XG4gICAgY3NzICs9IFwiQGxheWVyXCIuY29uY2F0KG9iai5sYXllci5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KG9iai5sYXllcikgOiBcIlwiLCBcIiB7XCIpO1xuICB9XG4gIGNzcyArPSBvYmouY3NzO1xuICBpZiAobmVlZExheWVyKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG4gIGlmIChvYmoubWVkaWEpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cbiAgaWYgKG9iai5zdXBwb3J0cykge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuICB2YXIgc291cmNlTWFwID0gb2JqLnNvdXJjZU1hcDtcbiAgaWYgKHNvdXJjZU1hcCAmJiB0eXBlb2YgYnRvYSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGNzcyArPSBcIlxcbi8qIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsXCIuY29uY2F0KGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSksIFwiICovXCIpO1xuICB9XG5cbiAgLy8gRm9yIG9sZCBJRVxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgICovXG4gIG9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0oY3NzLCBzdHlsZUVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG59XG5mdW5jdGlvbiByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KSB7XG4gIC8vIGlzdGFuYnVsIGlnbm9yZSBpZlxuICBpZiAoc3R5bGVFbGVtZW50LnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgc3R5bGVFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50KTtcbn1cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBkb21BUEkob3B0aW9ucykge1xuICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKCkge30sXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZSgpIHt9XG4gICAgfTtcbiAgfVxuICB2YXIgc3R5bGVFbGVtZW50ID0gb3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucyk7XG4gIHJldHVybiB7XG4gICAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUob2JqKSB7XG4gICAgICBhcHBseShzdHlsZUVsZW1lbnQsIG9wdGlvbnMsIG9iaik7XG4gICAgfSxcbiAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZSgpIHtcbiAgICAgIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpO1xuICAgIH1cbiAgfTtcbn1cbm1vZHVsZS5leHBvcnRzID0gZG9tQVBJOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIHN0eWxlVGFnVHJhbnNmb3JtKGNzcywgc3R5bGVFbGVtZW50KSB7XG4gIGlmIChzdHlsZUVsZW1lbnQuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG4gIH0gZWxzZSB7XG4gICAgd2hpbGUgKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICBzdHlsZUVsZW1lbnQucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgICBzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gIH1cbn1cbm1vZHVsZS5leHBvcnRzID0gc3R5bGVUYWdUcmFuc2Zvcm07IiwiaW1wb3J0ICdAaWNvbmZ1L3N2Zy1pbmplY3QnO1xuaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IGJ1aWxkSGVhZGVyIGZyb20gJy4vY29tcG9uZW50cy9oZWFkZXIvaGVhZGVyJztcbmltcG9ydCBidWlsZE1haW4gZnJvbSAnLi9jb21wb25lbnRzL21haW4vbWFpbic7XG5pbXBvcnQgJy4vYXBwLmNzcyc7XG5cbigoKSA9PiB7XG4gIGNvbnN0IGJ1aWxkID0ge1xuICAgIGhlYWRlcjogYnVpbGRIZWFkZXIsXG4gICAgbWFpbjogYnVpbGRNYWluLFxuICB9O1xuXG4gIGNvbnN0IGFwcCA9IHtcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGFwcFdyYXBwZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGFwcFdyYXBwZXIuaWQgPSAnYmF0dGxlc2hpcF9hcHAnO1xuXG4gICAgICBhcHBXcmFwcGVyLmFwcGVuZENoaWxkKGJ1aWxkLmhlYWRlcigpKTtcbiAgICAgIGFwcFdyYXBwZXIuYXBwZW5kQ2hpbGQoYnVpbGQubWFpbigpKTtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYXBwV3JhcHBlcik7XG4gICAgfSxcbiAgfTtcblxuICBhcHAuaW5pdCgpO1xufSkoKTtcbiIsImltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcblxuZXhwb3J0IGRlZmF1bHQgKHBsYXllciwgcGxheWVyQm9hcmQpID0+IHtcbiAgY29uc3QgYm9hcmQgPSB7XG4gICAgYm9hcmQ6IHBsYXllckJvYXJkLFxuICAgIHNoaXBzOiBbXSxcbiAgICBwbGF5ZXIsXG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHRoaXMucHVzaFNoaXAgPSB0aGlzLnB1c2hTaGlwLmJpbmQodGhpcyk7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKGBwdXNoU2hpcF8ke3RoaXMucGxheWVyLnN1YnN0cmluZyhwbGF5ZXIuaW5kZXhPZignXycpKX1gLCB0aGlzLnB1c2hTaGlwKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IHBsYXllckJvYXJkID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBwbGF5ZXJCb2FyZC5jbGFzc0xpc3QuYWRkKCdib2FyZCcpO1xuICAgICAgdGhpcy5ib2FyZC5mb3JFYWNoKChyb3csIHkpID0+IHtcbiAgICAgICAgY29uc3QgYm9hcmRSb3cgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgYm9hcmRSb3cuY2xhc3NMaXN0LmFkZCgnYm9hcmRfcm93Jyk7XG4gICAgICAgIHJvdy5mb3JFYWNoKChjZWxsLCB4KSA9PiB7XG4gICAgICAgICAgY29uc3QgY2VsbEJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICAgIGNlbGxCdG4uc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICBjbGFzczogJ2NlbGwnLFxuICAgICAgICAgICAgWydkYXRhLXgnXTogeCArIDEsXG4gICAgICAgICAgICBbJ2RhdGEteSddOiByb3cubGVuZ3RoIC0geSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBOZWVkIHRvIHNob3cgb25seSBhY3RpdmVQbGF5ZXIncyBzaGlwc1xuICAgICAgICAgIC8vIE5lZWQgdG8gaGlkZSB0aGUgb3Bwb25lbnQncyBzaGlwcyB3aGVuIGFjdGl2ZVBsYXllciBjaGFuZ2VzXG4gICAgICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICBjb25zdCBjZWxsQ29udGVudFNwYWNlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJ1xcdTAwQTAnKTtcbiAgICAgICAgICBjb25zdCBibGFua1dyYXBwZXIgPSBjcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgYmxhbmtXcmFwcGVyLmNsYXNzTGlzdC5hZGQoJ2JsYW5rX3dyYXBwZXInKTtcbiAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChibGFua1dyYXBwZXIpO1xuICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKGNlbGxDb250ZW50U3BhY2UpO1xuXG4gICAgICAgICAgaWYgKGNlbGwuc2hpcCkge1xuICAgICAgICAgICAgY2VsbEJ0bi5jbGFzc0xpc3QuYWRkKCdidXN5Jyk7XG4gICAgICAgICAgICAvLyBQcm9ibGVtLCBhbGxvd3Mgb3Bwb25lbnRzIHRvIGNoZWF0IGluIGEgYnJvd3NlciBkZXZlbG9wZXIgdG9vbHNcbiAgICAgICAgICAgIGNvbnN0IGNlbGxTaGlwID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBjb25zdCBmaW5kU2hpcCA9IHRoaXMuc2hpcHMuZmluZCgoc2hpcCkgPT4gc2hpcC5pZCA9PT0gY2VsbC5zaGlwLmlkKTtcbiAgICAgICAgICAgIGlmIChmaW5kU2hpcCkge1xuICAgICAgICAgICAgICBjZWxsU2hpcC5zdHlsZS5jc3NUZXh0ID0gZmluZFNoaXAuc3R5bGU7XG4gICAgICAgICAgICAgIHRoaXMuc2hpcHMuc3BsaWNlKHRoaXMuc2hpcHMuaW5kZXhPZihmaW5kU2hpcCksIDEpO1xuICAgICAgICAgICAgICBjZWxsU2hpcC5jbGFzc0xpc3QuYWRkKCdzaGlwX2JveCcpO1xuICAgICAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChjZWxsU2hpcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY2VsbENvbnRlbnQuY2xhc3NMaXN0LmFkZCgnY2VsbF9jb250ZW50Jyk7XG4gICAgICAgICAgY2VsbEJ0bi5hcHBlbmRDaGlsZChjZWxsQ29udGVudCk7XG4gICAgICAgICAgLy8gTmVlZCB0byBjaGVjayBmb3IgbGVmdCBhbmQgdG9wIGVkZ2VzIG9mIGJvYXJkXG4gICAgICAgICAgLy8gVG8gY3JlYXRlIHJvdyBhbmQgY29sdW1uIGxhYmVsc1xuICAgICAgICAgIGlmICh4ID09PSAwIHx8IHkgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd01hcmtlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgY29uc3QgY29sTWFya2VyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgICByb3dNYXJrZXIuc2V0QXR0cmlidXRlcyh7IGNsYXNzOiAnbWFya2VyIG1hcmtlcl9yb3cnLCB0ZXh0Q29udGVudDogYCR7eSArIDF9YCB9KTtcbiAgICAgICAgICAgICAgY2VsbENvbnRlbnQuYXBwZW5kQ2hpbGQocm93TWFya2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHkgPT09IDApIHtcbiAgICAgICAgICAgICAgY29sTWFya2VyLnNldEF0dHJpYnV0ZXMoe1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnbWFya2VyIG1hcmtlcl9jb2wnLFxuICAgICAgICAgICAgICAgIHRleHRDb250ZW50OiBgJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgeCl9YCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKGNvbE1hcmtlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJvYXJkUm93LmFwcGVuZENoaWxkKGNlbGxCdG4pO1xuICAgICAgICB9KTtcbiAgICAgICAgcGxheWVyQm9hcmQuYXBwZW5kQ2hpbGQoYm9hcmRSb3cpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcGxheWVyQm9hcmQ7XG4gICAgfSxcbiAgICBwdXNoU2hpcChzaGlwRGF0YSkge1xuICAgICAgLy8gTmVlZCB0byBzYXZlIHNoaXAgaW5mbzsgQ1NTIGFuZCBJRFxuICAgICAgY29uc3QgZmluZFNoaXAgPSB0aGlzLnNoaXBzLmZpbmQoKHNoaXApID0+IHNoaXAuaWQgPT09IHNoaXBEYXRhLmlkKTtcblxuICAgICAgaWYgKCFmaW5kU2hpcCkge1xuICAgICAgICB0aGlzLnNoaXBzLnB1c2goc2hpcERhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLnNoaXBzLmluZGV4T2YoZmluZFNoaXApO1xuICAgICAgICB0aGlzLnNoaXBzW2luZGV4XSA9IHNoaXBEYXRhO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG5cbiAgYm9hcmQuaW5pdCgpO1xuICAvLyByZXR1cm4gYm9hcmQucmVuZGVyKHBsYXllckJvYXJkKTtcbiAgcmV0dXJuIGJvYXJkO1xufTtcbiIsIiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgaGVhZGVyQ29uZmlnIGZyb20gJy4vaGVhZGVyLmNvbmZpZyc7XG5pbXBvcnQgbmF2YmFyIGZyb20gJy4vbmF2YmFyL25hdmJhcic7XG5pbXBvcnQgbm90aWZpY2F0aW9ucyBmcm9tICcuL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9ucyc7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9oZWFkZXIuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBoZWFkZXIgPSB7XG4gICAgaW5pdCgpIHt9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuaGVhZGVyID0gZWxlbWVudDtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7fSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBoZWFkZXJFbGVtZW50ID0gY3JlYXRlRWxlbWVudCgnaGVhZGVyJyk7XG4gICAgICBoZWFkZXJFbGVtZW50LmlkID0gJ2hlYWRlcic7XG4gICAgICBoZWFkZXJFbGVtZW50LmFwcGVuZENoaWxkKG5hdmJhcigpKTtcbiAgICAgIGhlYWRlckVsZW1lbnQuYXBwZW5kQ2hpbGQobm90aWZpY2F0aW9ucygpKTtcbiAgICAgIHRoaXMuY2FjaGVET00oaGVhZGVyRWxlbWVudCk7XG5cbiAgICAgIHJldHVybiBoZWFkZXJFbGVtZW50O1xuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIGhlYWRlci5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgSWNvbkdpdGh1YiBmcm9tICcuLi8uLi8uLi9hc3NldHMvaWNvbnMvZ2l0aHViX21hcmsvZ2l0aHViLW1hcmstd2hpdGUuc3ZnJztcblxuZXhwb3J0IGRlZmF1bHQgW1xuICB7XG4gICAgZWxlbWVudDogJ3VsJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICBjbGFzczogJ25hdl9sZWZ0JyxcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnIycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0gbmF2X2xvZ28nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnaW1nJyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBzcmM6ICcjJyxcbiAgICAgICAgICAgICAgICAgIC8vIG9ubG9hZDogJ1NWR0luamVjdCh0aGlzKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdoMScsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdCYXR0bGVzaGlwJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuICB7XG4gICAgZWxlbWVudDogJ3VsJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICBjbGFzczogJ25hdl9yaWdodCcsXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJyMnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtJyxcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdQbGFjZWhvbGRlcicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJyMnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtJyxcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdQbGFjZWhvbGRlcicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS9taWtleUNvcy9iYXR0bGVzaGlwL3RyZWUvbWFpbicsXG4gICAgICAgICAgICAgIHRhcmdldDogJ19ibGFuaycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0gZ2l0aHViJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2ltZycsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgY2xhc3M6ICdnaXRodWJfbG9nbycsXG4gICAgICAgICAgICAgICAgICBzcmM6IEljb25HaXRodWIsXG4gICAgICAgICAgICAgICAgICBvbmxvYWQ6ICdTVkdJbmplY3QodGhpcyknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJ2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICB0YXJnZXQ6ICdfc2VsZicsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0gbGVhdmVfZ2FtZSBpbmFjdGl2ZScsXG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnTGVhdmUgZ2FtZScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG5dO1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBuYXZiYXJDb25maWcgZnJvbSAnLi9uYXZiYXIuY29uZmlnJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0ICcuLi8uLi8uLi9zdHlsZXMvbmF2YmFyLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgbmF2YmFyID0ge1xuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLnJldmVhbExlYXZlID0gdGhpcy5yZXZlYWxMZWF2ZS5iaW5kKHRoaXMpO1xuICAgIH0sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5uYXZiYXIgPSBlbGVtZW50O1xuICAgICAgdGhpcy5uYXZMZWF2ZSA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLm5hdl9pdGVtLmxlYXZlX2dhbWUnKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKCdyZXZlYWxMZWF2ZScsIHRoaXMucmV2ZWFsTGVhdmUpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgbmF2RWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoJ25hdicpO1xuICAgICAgbmF2RWxlbWVudC5pZCA9ICduYXZiYXInO1xuXG4gICAgICBuYXZiYXJDb25maWcuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCBuYXZDaGlsZCA9IGNyZWF0ZUVsZW1lbnQoaXRlbS5lbGVtZW50KTtcbiAgICAgICAgbmF2Q2hpbGQuc2V0QXR0cmlidXRlcyhpdGVtLmF0dHJpYnV0ZXMpO1xuICAgICAgICBuYXZDaGlsZC5zZXRDaGlsZHJlbihpdGVtLmNoaWxkcmVuKTtcbiAgICAgICAgbmF2RWxlbWVudC5hcHBlbmRDaGlsZChuYXZDaGlsZCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5jYWNoZURPTShuYXZFbGVtZW50KTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgcmV0dXJuIG5hdkVsZW1lbnQ7XG4gICAgfSxcbiAgICByZXZlYWxMZWF2ZShlKSB7XG4gICAgICB0aGlzLm5hdkxlYXZlLmNsYXNzTGlzdC5yZW1vdmUoJ2luYWN0aXZlJyk7XG4gICAgfSxcbiAgfTtcblxuICBuYXZiYXIuaW5pdCgpO1xuICByZXR1cm4gbmF2YmFyLnJlbmRlcigpO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgZWxlbWVudDogJ2RpdicsXG4gIGF0dHJpYnV0ZXM6IHtcbiAgICBjbGFzczogJ25vdGlmaWNhdGlvbl9tZXNzYWdlJyxcbiAgfSxcbiAgb3B0aW9uczogW1xuICAgIHtcbiAgICAgIHR5cGU6ICdkZWZhdWx0JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgdGV4dENvbnRlbnQ6ICdQaWNrIGdhbWUgbW9kZScsXG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogJ3BsYWNlJyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgdGV4dENvbnRlbnQ6ICdQbGFjZSBzaGlwcycsXG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogJ3R1cm4nLFxuICAgICAgY3JlYXRlQXR0cmlidXRlcyh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRleHQ7XG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IHsgdGV4dENvbnRlbnQ6IGBQbGF5ZXIgJHtwbGF5ZXJ9J3MgdHVybi5gIH07XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogJ2dhbWVvdmVyJyxcbiAgICAgIGNyZWF0ZUF0dHJpYnV0ZXModGV4dCkge1xuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0ZXh0O1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7IHRleHRDb250ZW50OiBgR2FtZSBvdmVyLiBDb25ncmF0dWxhdGlvbnMsIHBsYXllciAke3BsYXllcn0gd29uIWAgfTtcbiAgICAgIH0sXG4gICAgICBzaWJsaW5nOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgaHJlZjogJ2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgdGFyZ2V0OiAnX3NlbGYnLFxuICAgICAgICAgICAgY2xhc3M6ICdwbGF5X2FnYWluJyxcbiAgICAgICAgICAgIHRleHRDb250ZW50OiAnUGxheSBBZ2FpbicsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgXSxcbn07XG5cbmV4cG9ydCBjb25zdCBjb250YWluZXIgPSB7XG4gIGVsZW1lbnQ6ICdkaXYnLFxuICBhdHRyaWJ1dGVzOiB7XG4gICAgaWQ6ICdub3RpZmljYXRpb25zX2NvbnRhaW5lcicsXG4gIH0sXG4gIGNoaWxkcmVuOiBbXG4gICAge1xuICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIGNsYXNzOiAnbm90aWZpY2F0aW9uX3dyYXBwZXInLFxuICAgICAgfSxcbiAgICB9LFxuICBdLFxufTtcbiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCBub3RpZmljYXRpb25zQ29uZmlnLCB7IGNvbnRhaW5lciB9IGZyb20gJy4vbm90aWZpY2F0aW9ucy5jb25maWcnO1xuaW1wb3J0ICcuLi8uLi8uLi9zdHlsZXMvbm90aWZpY2F0aW9ucy5jc3MnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIGNvbnN0IG5vdGlmaWNhdGlvbnMgPSB7XG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKTtcbiAgICB9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMubm90aWZpY2F0aW9uQ29udGFpbmVyID0gZWxlbWVudDtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKCdub3RpZnknLCB0aGlzLnJlbmRlcik7XG4gICAgfSxcbiAgICByZW5kZXIodHlwZSwgcGxheWVyKSB7XG4gICAgICBjb25zdCBtZXNzYWdlVHlwZSA9IHR5cGUgPyB0eXBlIDogJ2RlZmF1bHQnO1xuICAgICAgY29uc3Qgbm90aWZpY2F0aW9uQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudChjb250YWluZXIuZWxlbWVudCk7XG4gICAgICBub3RpZmljYXRpb25Db250YWluZXIuc2V0QXR0cmlidXRlcyhjb250YWluZXIuYXR0cmlidXRlcyk7XG4gICAgICBub3RpZmljYXRpb25Db250YWluZXIuc2V0Q2hpbGRyZW4oY29udGFpbmVyLmNoaWxkcmVuKTtcbiAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbldyYXBwZXIgPSBub3RpZmljYXRpb25Db250YWluZXIuZmlyc3RDaGlsZDtcblxuICAgICAgY29uc3QgbWVzc2FnZSA9IG5vdGlmaWNhdGlvbnNDb25maWcub3B0aW9ucy5maW5kKChtZXNzYWdlKSA9PiBtZXNzYWdlLnR5cGUgPT09IG1lc3NhZ2VUeXBlKTtcbiAgICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgICAgbWVzc2FnZS5jcmVhdGVBdHRyaWJ1dGVzKHBsYXllcik7XG4gICAgICB9XG4gICAgICBjb25zdCBub3RpZmljYXRpb25NZXNzYWdlID0gY3JlYXRlRWxlbWVudChub3RpZmljYXRpb25zQ29uZmlnLmVsZW1lbnQpO1xuICAgICAgbm90aWZpY2F0aW9uTWVzc2FnZS5zZXRBdHRyaWJ1dGVzKHtcbiAgICAgICAgLi4ubm90aWZpY2F0aW9uc0NvbmZpZy5hdHRyaWJ1dGVzLFxuICAgICAgICAuLi5tZXNzYWdlLmF0dHJpYnV0ZXMsXG4gICAgICB9KTtcbiAgICAgIG5vdGlmaWNhdGlvbkNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKG1lc3NhZ2UudHlwZSk7XG4gICAgICBub3RpZmljYXRpb25XcmFwcGVyLmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbk1lc3NhZ2UpO1xuXG4gICAgICBpZiAodHlwZSkge1xuICAgICAgICB0aGlzLm5vdGlmaWNhdGlvbkNvbnRhaW5lci5yZXBsYWNlV2l0aChub3RpZmljYXRpb25Db250YWluZXIpO1xuICAgICAgICBpZiAobWVzc2FnZS5zaWJsaW5nKSBub3RpZmljYXRpb25XcmFwcGVyLnNldENoaWxkcmVuKG1lc3NhZ2Uuc2libGluZyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY2FjaGVET00obm90aWZpY2F0aW9uQ29udGFpbmVyKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgaWYgKCFwbGF5ZXIpIHJldHVybiBub3RpZmljYXRpb25Db250YWluZXI7XG4gICAgfSxcbiAgfTtcblxuICBub3RpZmljYXRpb25zLmluaXQoKTtcbiAgcmV0dXJuIG5vdGlmaWNhdGlvbnMucmVuZGVyKCk7XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgW1xuICB7XG4gICAgZWxlbWVudDogJ3NlY3Rpb24nLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgIGNsYXNzOiAnZ2FtZW1vZGVfYnRucycsXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnYnV0dG9uJyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAnZ2FtZW1vZGVfYnRuIGh1bWFuX2h1bWFuJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnaHVtYW4gdnMgaHVtYW4nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICBjbGFzczogJ2dhbWVtb2RlX2J0biBodW1hbl9jb21wdXRlcicsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ2h1bWFuIHZzIGNvbXB1dGVyJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbl07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IGhvbWVDb25maWcgZnJvbSAnLi9ob21lLmNvbmZpZyc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL2hvbWUuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBob21lID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmhvbWUgPSBlbGVtZW50O1xuICAgICAgdGhpcy5oZWFkZXIgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvcignaDInKTtcbiAgICAgIHRoaXMubW9kZUJ0bnMgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvckFsbCgnLmdhbWVtb2RlX2J0bicpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHRoaXMuc2V0R2FtZU1vZGUgPSB0aGlzLnNldEdhbWVNb2RlLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLm1vZGVCdG5zLmZvckVhY2goKGJ0bikgPT4gYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zZXRHYW1lTW9kZSkpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgaG9tZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgaG9tZUNvbnRhaW5lci5pZCA9ICdob21lJztcblxuICAgICAgaG9tZUNvbmZpZy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IGhvbWVDaGlsZCA9IGNyZWF0ZUVsZW1lbnQoaXRlbS5lbGVtZW50KTtcbiAgICAgICAgaWYgKGl0ZW0uYXR0cmlidXRlcykgaG9tZUNoaWxkLnNldEF0dHJpYnV0ZXMoaXRlbS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgaWYgKGl0ZW0uY2hpbGRyZW4pIGhvbWVDaGlsZC5zZXRDaGlsZHJlbihpdGVtLmNoaWxkcmVuKTtcbiAgICAgICAgaG9tZUNvbnRhaW5lci5hcHBlbmRDaGlsZChob21lQ2hpbGQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuY2FjaGVET00oaG9tZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIHJldHVybiBob21lQ29udGFpbmVyO1xuICAgIH0sXG4gICAgc2V0R2FtZU1vZGUoZSkge1xuICAgICAgY29uc3QgZ2FtZW1vZGUgPSAhZS5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC52YWx1ZS5pbmNsdWRlcygnY29tcHV0ZXInKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdtYWluX3JlbmRlcicsIGdhbWVtb2RlKTtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBob21lLnJlbmRlcigpO1xufTtcbiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgc2NyZWVuQ29udHJvbGxlciBmcm9tICcuLi9zY3JlZW4vc2NyZWVuQ29udHJvbGxlcic7XG5pbXBvcnQgYnVpbGRIb21lIGZyb20gJy4uL2hvbWUvaG9tZSc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBidWlsZCA9IHtcbiAgICBob21lOiBidWlsZEhvbWUsXG4gICAgZ2FtZTogc2NyZWVuQ29udHJvbGxlcixcbiAgfTtcbiAgY29uc3QgbWFpbiA9IHtcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpO1xuICAgIH0sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5tYWluID0gZWxlbWVudDtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKCdtYWluX3JlbmRlcicsIHRoaXMucmVuZGVyKTtcbiAgICB9LFxuICAgIHJlbmRlcihtb2RlKSB7XG4gICAgICBpZiAobW9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IG1haW5Db250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgbWFpbkNvbnRhaW5lci5pZCA9ICdtYWluX2NvbnRlbnQnO1xuICAgICAgICBtYWluQ29udGFpbmVyLmFwcGVuZENoaWxkKGJ1aWxkLmhvbWUoKSk7XG4gICAgICAgIHRoaXMuY2FjaGVET00obWFpbkNvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgICByZXR1cm4gbWFpbkNvbnRhaW5lcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubWFpbi5maXJzdEVsZW1lbnRDaGlsZC5yZXBsYWNlV2l0aChidWlsZC5nYW1lKG1vZGUpKTtcbiAgICAgICAgcHViU3ViLnB1Ymxpc2goJ3JldmVhbExlYXZlJyk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcblxuICBtYWluLmluaXQoKTtcbiAgcmV0dXJuIG1haW4ucmVuZGVyKCk7XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBlbGVtZW50OiAnZGl2JyxcbiAgYXR0cmlidXRlczoge1xuICAgIGNsYXNzOiAncG9ydCcsXG4gIH0sXG4gIGNoaWxkcmVuOiBbXG4gICAge1xuICAgICAgZWxlbWVudDogJ3AnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICB0ZXh0Q29udGVudDogJ0RyYWcgdGhlIHNoaXBzIHRvIHRoZSBncmlkLCBhbmQgdGhlbiBjbGljayB0byByb3RhdGU6JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgIH0sXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogOGVtOyBoZWlnaHQ6IDJlbTsgcGFkZGluZy1yaWdodDogNnB4OyBwYWRkaW5nLWJvdHRvbTogMHB4OycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICc0JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDhlbTsgaGVpZ2h0OiAyZW07IHBhZGRpbmctcmlnaHQ6IDZweDsgcGFkZGluZy1ib3R0b206IDBweDsnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICBjbGFzczogJ3BvcnRfbGluZXMnLFxuICAgICAgfSxcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOyBwYWRkaW5nLXJpZ2h0OiA0cHg7IHBhZGRpbmctYm90dG9tOiAwcHg7JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1sZW5ndGgnXTogJzMnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsgcGFkZGluZy1yaWdodDogNHB4OyBwYWRkaW5nLWJvdHRvbTogMHB4OycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOyBwYWRkaW5nLXJpZ2h0OiA0cHg7IHBhZGRpbmctYm90dG9tOiAwcHg7JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1sZW5ndGgnXTogJzMnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsgcGFkZGluZy1yaWdodDogNHB4OyBwYWRkaW5nLWJvdHRvbTogMHB4OycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gICAge1xuICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIGNsYXNzOiAncG9ydF9saW5lcycsXG4gICAgICB9LFxuICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDRlbTsgaGVpZ2h0OiAyZW07IHBhZGRpbmctcmlnaHQ6IDJweDsgcGFkZGluZy1ib3R0b206IDBweDsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOyBwYWRkaW5nLXJpZ2h0OiAycHg7IHBhZGRpbmctYm90dG9tOiAwcHg7JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDRlbTsgaGVpZ2h0OiAyZW07IHBhZGRpbmctcmlnaHQ6IDJweDsgcGFkZGluZy1ib3R0b206IDBweDsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOyBwYWRkaW5nLXJpZ2h0OiAycHg7IHBhZGRpbmctYm90dG9tOiAwcHg7JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDRlbTsgaGVpZ2h0OiAyZW07IHBhZGRpbmctcmlnaHQ6IDJweDsgcGFkZGluZy1ib3R0b206IDBweDsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOyBwYWRkaW5nLXJpZ2h0OiAycHg7IHBhZGRpbmctYm90dG9tOiAwcHg7JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgIH0sXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1sZW5ndGgnXTogJzEnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gICAge1xuICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIGNsYXNzOiAnYnRuc19jb250YWluZXInLFxuICAgICAgfSxcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3Jlc2V0JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdidXR0b24nLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdyZXNldF9idG4gaW5hY3RpdmUnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJyxcbiAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdSZXNldCcsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3JhbmRvbScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnYnV0dG9uJyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAncmFuZG9taXplX2J0bicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1JhbmRvbWl6ZScsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3JlYWR5JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdidXR0b24nLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdyZWFkeV9idG4gaW5hY3RpdmUnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1yZWFkeSddOiBmYWxzZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50OiAnUmVhZHknLFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICBdLFxufTtcbiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgcG9ydENvbmZpZyBmcm9tICcuL3BvcnQuY29uZmlnJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGJvYXJkIGZyb20gJy4uL2JvYXJkL2JvYXJkJztcblxuZXhwb3J0IGRlZmF1bHQgKHBsYXllciwgZ2FtZSwgbW9kZSwgYm9hcmQpID0+IHtcbiAgY29uc3QgcG9ydCA9IHtcbiAgICAvLyBSZW5hbWUgdG8gcG9ydENvbnRyb2xsZXIgb3Igc2hpcHNDb250cm9sbGVyP1xuICAgIHBsYXllcixcbiAgICBnYW1lLFxuICAgIG1vZGUsXG4gICAgYm9hcmQsXG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMuZHJhZ1N0YXJ0SGFuZGxlciA9IHRoaXMuZHJhZ1N0YXJ0SGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5kcmFnRW5kSGFuZGxlciA9IHRoaXMuZHJhZ0VuZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuZHJhZ01vdmVIYW5kbGVyID0gdGhpcy5kcmFnTW92ZUhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuZHJvcEhhbmRsZXIgPSB0aGlzLmRyb3BIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLnJvdGF0ZUhhbmRsZXIgPSB0aGlzLnJvdGF0ZUhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuZHJhZ1N0YXJ0SGFuZGxlciA9IHRoaXMuZHJhZ1N0YXJ0SGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5yZXNldEhhbmRsZXIgPSB0aGlzLnJlc2V0SGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5yZWFkeUhhbmRsZXIgPSB0aGlzLnJlYWR5SGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5yYW5kb21pemVIYW5kbGVyID0gdGhpcy5yYW5kb21pemVIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLnBsYWNlUmFuZG9tID0gdGhpcy5wbGFjZVJhbmRvbS5iaW5kKHRoaXMpO1xuXG4gICAgICB0aGlzLnBsYXllckJvYXJkID1cbiAgICAgICAgcGxheWVyID09PSAncGxheWVyX29uZScgPyB0aGlzLmdhbWUucGxheWVyT25lQm9hcmQgOiB0aGlzLmdhbWUucGxheWVyVHdvQm9hcmQ7XG4gICAgICB0aGlzLmRyb3BTdWJzY3JpYmVyID0gYGRyb3Ake3BsYXllci5zdWJzdHJpbmcocGxheWVyLmluZGV4T2YoJ18nKSl9YDtcbiAgICAgIHRoaXMucm90YXRlU3Vic2NyaWJlciA9IGByb3RhdGUke3BsYXllci5zdWJzdHJpbmcocGxheWVyLmluZGV4T2YoJ18nKSl9YDtcbiAgICAgIHRoaXMucGxhY2VSYW5kb21TdWJzY3JpYmVyID0gYHBsYWNlUmFuZG9tJHtwbGF5ZXIuc3Vic3RyaW5nKHBsYXllci5pbmRleE9mKCdfJykpfWA7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLnBvcnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5wb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBvcnRfc2hpcCcpO1xuICAgICAgdGhpcy5zaGlwcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNoaXBfYm94Jyk7XG4gICAgICB0aGlzLnJlc2V0QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVzZXRfYnRuJyk7XG4gICAgICB0aGlzLnJlYWR5QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVhZHlfYnRuJyk7XG4gICAgICB0aGlzLnJhbmRvbWl6ZUJ0biA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnJhbmRvbWl6ZV9idG4nKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICB0aGlzLnNoaXBzLmZvckVhY2goKHNoaXApID0+IHtcbiAgICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDA0NjQ2OTAvd2FudC10by1wZXJmb3JtLWRpZmZlcmVudC10YXNrLW9uLW1vdXNlZG93bi1hbmQtY2xpY2stZXZlbnRcbiAgICAgICAgc2hpcC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLmRyYWdTdGFydEhhbmRsZXIpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMucmVzZXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLnJlc2V0SGFuZGxlcik7XG4gICAgICB0aGlzLnJlYWR5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5yZWFkeUhhbmRsZXIpO1xuICAgICAgdGhpcy5yYW5kb21pemVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLnJhbmRvbWl6ZUhhbmRsZXIpO1xuICAgICAgcHViU3ViLnN1YnNjcmliZSh0aGlzLmRyb3BTdWJzY3JpYmVyLCB0aGlzLmRyb3BIYW5kbGVyKTtcbiAgICAgIHB1YlN1Yi5zdWJzY3JpYmUodGhpcy5yb3RhdGVTdWJzY3JpYmVyLCB0aGlzLnJvdGF0ZUhhbmRsZXIpO1xuICAgICAgcHViU3ViLnN1YnNjcmliZSh0aGlzLnBsYWNlUmFuZG9tU3Vic2NyaWJlciwgdGhpcy5wbGFjZVJhbmRvbSk7XG4gICAgfSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBwbGF5ZXJQb3J0ID0gY3JlYXRlRWxlbWVudChwb3J0Q29uZmlnLmVsZW1lbnQpO1xuICAgICAgcGxheWVyUG9ydC5zZXRBdHRyaWJ1dGVzKHBvcnRDb25maWcuYXR0cmlidXRlcyk7XG4gICAgICBwbGF5ZXJQb3J0LnNldENoaWxkcmVuKHBvcnRDb25maWcuY2hpbGRyZW4pO1xuICAgICAgdGhpcy5jYWNoZURPTShwbGF5ZXJQb3J0KTtcbiAgICAgIGlmICghdGhpcy5tb2RlKSB0aGlzLnJlYWR5QnRuLmNsYXNzTGlzdC5hZGQoJ2luYWN0aXZlJyk7XG4gICAgICBpZiAoIXRoaXMubW9kZSAmJiB0aGlzLnBsYXllciA9PT0gJ3BsYXllcl90d28nKSB0aGlzLnBvcnQuY2xhc3NMaXN0LmFkZCgnaW5hY3RpdmUnKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgcmV0dXJuIHBsYXllclBvcnQ7XG4gICAgfSxcbiAgICBkcmFnU3RhcnRIYW5kbGVyKGUpIHtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlID0gZS5jdXJyZW50VGFyZ2V0O1xuICAgICAgdGhpcy5kcmFnU3RhcnQgPSBlLnRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgICAgdGhpcy5kcm9wUGxhY2Vob2xkZXIgPSB0aGlzLmRyYWdnYWJsZS5jbG9uZU5vZGUoKTtcbiAgICAgIHRoaXMuZHJvcFBsYWNlaG9sZGVyLmNsYXNzTGlzdC5hZGQoJ3NoaXBfYm94X3BsYWNlaG9sZGVyJyk7XG4gICAgICB0aGlzLm9mZlNldFggPSBlLmNsaWVudFg7XG4gICAgICB0aGlzLm9mZlNldFkgPSBlLmNsaWVudFk7XG5cbiAgICAgIHRoaXMuZHJhZ1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuZHJhZ01vdmVIYW5kbGVyKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucm90YXRlSGFuZGxlcik7XG4gICAgICB9LCAyNTApO1xuXG4gICAgICB0aGlzLmRyYWdnYWJsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucm90YXRlSGFuZGxlciwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH0sXG4gICAgZHJhZ01vdmVIYW5kbGVyKGUpIHtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5hZGQoJ2RyYWdnaW5nJyk7XG4gICAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QuYWRkKCdkcmFnc3RhcnQnKTtcblxuICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAke2UuY2xpZW50WCAtIHRoaXMub2ZmU2V0WH1weGA7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgJHtlLmNsaWVudFkgLSB0aGlzLm9mZlNldFl9cHhgO1xuXG4gICAgICBjb25zdCB7IGxlZnQsIHRvcCwgd2lkdGggfSA9IHRoaXMuZHJhZ2dhYmxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3Qgc2hpcExlbmd0aCA9IHBhcnNlSW50KHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQubGVuZ3RoKTtcbiAgICAgIGNvbnN0IG9mZlNldCA9ICh3aWR0aCAvIHNoaXBMZW5ndGgpICogMC41O1xuXG4gICAgICBjb25zdCBjZWxsID0gZG9jdW1lbnRcbiAgICAgICAgLmVsZW1lbnRzRnJvbVBvaW50KGxlZnQgKyBvZmZTZXQsIHRvcCArIG9mZlNldClcbiAgICAgICAgLmZpbmQoKGVsZW1lbnQpID0+IGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjZWxsJykpO1xuXG4gICAgICBjb25zdCBib2FyZCA9IGRvY3VtZW50XG4gICAgICAgIC5lbGVtZW50c0Zyb21Qb2ludChsZWZ0ICsgb2ZmU2V0LCB0b3AgKyBvZmZTZXQpXG4gICAgICAgIC5maW5kKChlbGVtZW50KSA9PiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnYm9hcmQnKSk7XG4gICAgICBjb25zdCBpc1BsYXllclNoaXAgPSBib2FyZCA/IGJvYXJkLnBhcmVudEVsZW1lbnQuY29udGFpbnModGhpcy5wb3J0KSA6IGZhbHNlO1xuICAgICAgaWYgKGNlbGwgJiYgaXNQbGF5ZXJTaGlwKSB7XG4gICAgICAgIC8vIERyYWdnaW5nIG92ZXIgZHJvcCB6b25lXG4gICAgICAgIC8vIElmIGRyYWdnYWJsZSBpcyBtb3JlIHRoYW4gNTAlIG92ZXIgaXQncyAnbGFzdCcgY2VsbFxuICAgICAgICAvLyAgQXBwZW5kIHRoZSBkcmFnZ2FibGUgdG8gdGhlIGNlbGwgY29udGVudCBjb250YWluZXJcbiAgICAgICAgdGhpcy5jZWxsID0gY2VsbDtcbiAgICAgICAgY29uc3QgeCA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LngpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueSk7XG5cbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQub3JpZW50YXRpb24gIT09ICdoJztcblxuICAgICAgICB0aGlzLnBsYXllckJvYXJkLnBsYWNlU2hpcChcbiAgICAgICAgICBbeCwgeV0sXG4gICAgICAgICAgc2hpcExlbmd0aCxcbiAgICAgICAgICBvcmllbnRhdGlvbixcbiAgICAgICAgICB0cnVlLFxuICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgIGlkLFxuICAgICAgICAgIHRoaXMuZHJvcFN1YnNjcmliZXIsXG4gICAgICAgICAgdGhpcy5yb3RhdGVTdWJzY3JpYmVyLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRHJhZ2dpbmcgb3ZlciBhIG5vbiBkcm9wIHpvbmVcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5jb250YWlucygnc2hpcF9ib3hfdHJhbnNwYXJlbnQnKSAmJlxuICAgICAgICAgIHRoaXMuY2VsbC5maXJzdENoaWxkLmxhc3RDaGlsZFxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLmNlbGwuZmlyc3RDaGlsZC5sYXN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5jZWxsID0gbnVsbDtcbiAgICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QucmVtb3ZlKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkcmFnRW5kSGFuZGxlcihlKSB7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5sZWZ0ID0gYDBweGA7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgMHB4YDtcblxuICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZ2dpbmcnKTtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnc3RhcnQnKTtcblxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5kcmFnTW92ZUhhbmRsZXIpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICAgICAgaWYgKHRoaXMuY2VsbCkge1xuICAgICAgICAvLyBJZiB1c2VyIGhhcyBzdG9wcGVkIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh0aGlzLmNlbGwuZGF0YXNldC55KTtcbiAgICAgICAgY29uc3Qgc2hpcExlbmd0aCA9IHBhcnNlSW50KHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQub3JpZW50YXRpb24gIT09ICdoJztcblxuICAgICAgICB0aGlzLnBsYXllckJvYXJkLnBsYWNlU2hpcChcbiAgICAgICAgICBbeCwgeV0sXG4gICAgICAgICAgc2hpcExlbmd0aCxcbiAgICAgICAgICBvcmllbnRhdGlvbixcbiAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICBpZCxcbiAgICAgICAgICB0aGlzLmRyb3BTdWJzY3JpYmVyLFxuICAgICAgICAgIHRoaXMucm90YXRlU3Vic2NyaWJlcixcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QuY29udGFpbnMoJ3BvcnRfc2hpcCcpICYmIHRoaXMuZHJhZ2dhYmxlKSB7XG4gICAgICAgIC8vIElmIGRyYWdTdGFydCBpcyBub3QgdGhlIHBvcnRfc2hpcCBlbGVtZW50XG4gICAgICB9XG4gICAgfSxcbiAgICBkcm9wSGFuZGxlcihpc0RyYWdnaW5nLCBpc1ZhbGlkRHJvcCkge1xuICAgICAgaWYgKHRoaXMuY2VsbCkge1xuICAgICAgICBjb25zdCBjZWxsQ29udGVudCA9IHRoaXMuY2VsbC5maXJzdENoaWxkO1xuICAgICAgICBpZiAoaXNEcmFnZ2luZyAmJiBpc1ZhbGlkRHJvcCkge1xuICAgICAgICAgIC8vIElmIHVzZXIgaXMgZHJhZ2dpbmcgb3ZlciB0aGUgZHJvcCB6b25lXG4gICAgICAgICAgY2VsbENvbnRlbnQuYXBwZW5kQ2hpbGQodGhpcy5kcm9wUGxhY2Vob2xkZXIpO1xuICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5hZGQoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzRHJhZ2dpbmcgJiYgaXNWYWxpZERyb3ApIHtcbiAgICAgICAgICAvLyBJZiB1c2VyIGhhcyBzdG9wcGVkIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKHRoaXMuZHJhZ2dhYmxlKTtcbiAgICAgICAgICB0aGlzLmRyb3BQbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICAgICAgICBpZiAodGhpcy5yZXNldEJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ2luYWN0aXZlJykpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaW5hY3RpdmUnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5pc1BvcnRzRW1wdHkoKSAmJiAhdGhpcy5wbGF5ZXJSZWFkeSkge1xuICAgICAgICAgICAgdGhpcy5wbGF5ZXJSZWFkeSA9IHRydWU7XG4gICAgICAgICAgICBpZiAoIXRoaXMubW9kZSkgcHViU3ViLnB1Ymxpc2goJ3BsYXllclJlYWR5JywgdGhpcy5wbGF5ZXIpO1xuICAgICAgICAgICAgaWYgKHRoaXMubW9kZSkge1xuICAgICAgICAgICAgICB0aGlzLnJlYWR5QnRuLmNsaWNrKCk7XG4gICAgICAgICAgICAgIHRoaXMucmVhZHlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaW5hY3RpdmUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgWy4uLnRoaXMucG9ydC5jaGlsZHJlbl0uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFjaGlsZC5jbGFzc0xpc3QuY29udGFpbnMoJ2J0bnNfY29udGFpbmVyJykpIHtcbiAgICAgICAgICAgICAgICBjaGlsZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwdWJTdWIucHVibGlzaChgcHVzaFNoaXBfJHt0aGlzLnBsYXllcn1gLCB7XG4gICAgICAgICAgICAuLi50aGlzLmRyYWdnYWJsZS5kYXRhc2V0LFxuICAgICAgICAgICAgc3R5bGU6IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmNzc1RleHQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEcmFnZ2luZyAmJiAhaXNWYWxpZERyb3ApIHtcbiAgICAgICAgICAvLyBJZiB1c2VyIGlzIGRyYWdnaW5nIG92ZXIgYW4gaW52YWxpZCBkcm9wXG4gICAgICAgICAgaWYgKHRoaXMuZHJvcFBsYWNlaG9sZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRyb3BQbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICByb3RhdGVIYW5kbGVyKGUpIHtcbiAgICAgIGNvbnN0IG5ld09yaWVudGF0aW9uID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5vcmllbnRhdGlvbiA9PT0gJ2gnO1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNb3VzZUV2ZW50KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRyYWdUaW1lcik7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAhdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkcmFnZ2luZycpICYmXG4gICAgICAgICAgIXRoaXMuZHJhZ1N0YXJ0LmNsYXNzTGlzdC5jb250YWlucygncG9ydF9zaGlwJylcbiAgICAgICAgKSB7XG4gICAgICAgICAgLy8gSWYgc2hpcCBpcyBub3QgYmVpbmcgZHJhZ2dlZCBhbmQgaXQgaXMgbm90IGluIHBvcnRcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5jZWxsID0gdGhpcy5kcmFnU3RhcnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LnkpO1xuICAgICAgICAgIGNvbnN0IHNoaXBMZW5ndGggPSBwYXJzZUludCh0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lmxlbmd0aCk7XG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICAgIHRoaXMucGxheWVyQm9hcmQucGxhY2VTaGlwKFxuICAgICAgICAgICAgW3gsIHldLFxuICAgICAgICAgICAgc2hpcExlbmd0aCxcbiAgICAgICAgICAgIG5ld09yaWVudGF0aW9uLFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICB0cnVlLFxuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICB0aGlzLmRyb3BTdWJzY3JpYmVyLFxuICAgICAgICAgICAgdGhpcy5yb3RhdGVTdWJzY3JpYmVyLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgIH0gZWxzZSBpZiAoZSA9PT0gdHJ1ZSAmJiBwYXJzZUludCh0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lmxlbmd0aCkgPiAxKSB7XG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQub3JpZW50YXRpb24gPSBuZXdPcmllbnRhdGlvbiA/ICd2JyA6ICdoJztcbiAgICAgICAgY29uc3QgbmV3V2lkdGggPSBuZXdPcmllbnRhdGlvbiA/IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLndpZHRoIDogdGhpcy5kcmFnZ2FibGUuc3R5bGUuaGVpZ2h0O1xuICAgICAgICBjb25zdCBuZXdIZWlnaHQgPSBuZXdPcmllbnRhdGlvbiA/IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmhlaWdodCA6IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLndpZHRoO1xuICAgICAgICBjb25zdCBuZXdQYWRkaW5nUmlnaHQgPSBuZXdPcmllbnRhdGlvblxuICAgICAgICAgID8gdGhpcy5kcmFnZ2FibGUuc3R5bGUucGFkZGluZ1JpZ2h0XG4gICAgICAgICAgOiB0aGlzLmRyYWdnYWJsZS5zdHlsZS5wYWRkaW5nQm90dG9tO1xuICAgICAgICBjb25zdCBuZXdQYWRkaW5nQm90dG9tID0gbmV3T3JpZW50YXRpb25cbiAgICAgICAgICA/IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnBhZGRpbmdCb3R0b21cbiAgICAgICAgICA6IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnBhZGRpbmdSaWdodDtcbiAgICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUud2lkdGggPSBuZXdPcmllbnRhdGlvbiA/IG5ld0hlaWdodCA6IG5ld1dpZHRoO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5oZWlnaHQgPSBuZXdPcmllbnRhdGlvbiA/IG5ld1dpZHRoIDogbmV3SGVpZ2h0O1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5wYWRkaW5nUmlnaHQgPSBuZXdPcmllbnRhdGlvbiA/IG5ld1BhZGRpbmdCb3R0b20gOiBuZXdQYWRkaW5nUmlnaHQ7XG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnBhZGRpbmdCb3R0b20gPSBuZXdPcmllbnRhdGlvbiA/IG5ld1BhZGRpbmdSaWdodCA6IG5ld1BhZGRpbmdCb3R0b207XG4gICAgICAgIHB1YlN1Yi5wdWJsaXNoKGBwdXNoU2hpcF8ke3RoaXMucGxheWVyfWAsIHtcbiAgICAgICAgICAuLi50aGlzLmRyYWdnYWJsZS5kYXRhc2V0LFxuICAgICAgICAgIHN0eWxlOiB0aGlzLmRyYWdnYWJsZS5zdHlsZS5jc3NUZXh0LFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmFkZCgncm90YXRlX2Vycm9yJyk7XG5cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgncm90YXRlX2Vycm9yJyk7XG4gICAgICAgIH0sIDI1MCk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZXNldEhhbmRsZXIoZSkge1xuICAgICAgLy8gQ2xlYXJzIGJvYXJkXG4gICAgICB0aGlzLnBsYXllclJlYWR5ID0gZmFsc2U7XG4gICAgICBjb25zdCBwbGF5ZXJCb2FyZCA9IHRoaXMucmVzZXRCdG4uY2xvc2VzdChcbiAgICAgICAgdGhpcy5yZXNldEJ0bi5jbG9zZXN0KCcucGxheWVyX29uZScpID8gJy5wbGF5ZXJfb25lJyA6ICcucGxheWVyX3R3bycsXG4gICAgICApLmZpcnN0Q2hpbGQ7XG5cbiAgICAgIHRoaXMucGxheWVyQm9hcmQuY2xlYXJCb2FyZCgpO1xuICAgICAgdGhpcy5wb3J0LnJlcGxhY2VXaXRoKHRoaXMucmVuZGVyKCkpO1xuICAgICAgcGxheWVyQm9hcmQucmVwbGFjZVdpdGgodGhpcy5ib2FyZC5yZW5kZXIoKSk7XG4gICAgICBwdWJTdWIucHVibGlzaCgncGxheWVyUmVhZHknLCB0aGlzLnBsYXllciwgZmFsc2UpO1xuICAgIH0sXG4gICAgaXNQb3J0c0VtcHR5KCkge1xuICAgICAgcmV0dXJuIFsuLi50aGlzLnBvcnRzXS5ldmVyeSgocG9ydCkgPT4gcG9ydC5maXJzdENoaWxkID09PSBudWxsKTtcbiAgICB9LFxuICAgIHJlYWR5SGFuZGxlcihlKSB7XG4gICAgICBjb25zdCBpc1JlYWR5ID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQucmVhZHkgIT09ICd0cnVlJztcbiAgICAgIGUuY3VycmVudFRhcmdldC50ZXh0Q29udGVudCA9IGlzUmVhZHkgPyAnVW5yZWFkeScgOiAnUmVhZHknO1xuICAgICAgZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQucmVhZHkgPSBpc1JlYWR5O1xuICAgICAgdGhpcy5oaWRlU2hpcHMoaXNSZWFkeSk7XG4gICAgICBwdWJTdWIucHVibGlzaCgncGxheWVyUmVhZHknLCB0aGlzLnBsYXllciwgaXNSZWFkeSk7XG4gICAgfSxcbiAgICByYW5kb21pemVIYW5kbGVyKGUpIHtcbiAgICAgIHRoaXMucmVzZXRCdG4uY2xpY2soKTtcbiAgICAgIHRoaXMucGxheWVyQm9hcmQucGxhY2VTaGlwc1JhbmRvbSh0aGlzLnBsYXllci5zdWJzdHJpbmcodGhpcy5wbGF5ZXIuaW5kZXhPZignXycpICsgMSkpO1xuICAgICAgaWYgKHRoaXMubW9kZSkge1xuICAgICAgICAvLyBJZiBodW1hbiB2cyBodW1hblxuICAgICAgICB0aGlzLnJlYWR5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2luYWN0aXZlJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmlzUG9ydHNFbXB0eSgpICYmICF0aGlzLnBsYXllclJlYWR5KSB7XG4gICAgICAgIFsuLi50aGlzLnBvcnQuY2hpbGRyZW5dLmZvckVhY2goKGNoaWxkKSA9PiB7XG4gICAgICAgICAgaWYgKCFjaGlsZC5jbGFzc0xpc3QuY29udGFpbnMoJ2J0bnNfY29udGFpbmVyJykpIHtcbiAgICAgICAgICAgIGNoaWxkLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaW5hY3RpdmUnKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdwbGF5ZXJSZWFkeScsIHRoaXMucGxheWVyKTtcbiAgICB9LFxuICAgIGhpZGVTaGlwcyhpc1JlYWR5KSB7XG4gICAgICB0aGlzLnNoaXBzLmZvckVhY2goKHNoaXApID0+IHtcbiAgICAgICAgY29uc3QgZGlzcGxheSA9IGlzUmVhZHkgPyAnbm9uZScgOiAnYmxvY2snO1xuICAgICAgICBzaGlwLnN0eWxlLmRpc3BsYXkgPSBkaXNwbGF5O1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXRDZWxsQ29udGVudChbeCwgeV0pIHtcbiAgICAgIC8vIEZpbmQgY2VsbCB3aXRoIGRhdGFzZXQueCA9PT0geCAmJiBkYXRhc2V0LnkgPT09eVxuICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgIGAuJHt0aGlzLnBsYXllcn0gPiAqID4gKiA+IC5jZWxsW2RhdGEteD0nJHt4fSddW2RhdGEteT0nJHt5fSddID4gLmNlbGxfY29udGVudGAsXG4gICAgICApO1xuICAgIH0sXG4gICAgZ2V0U2hpcEJveChzaGlwTGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcbiAgICAgICAgYC4ke3RoaXMucGxheWVyfSA+IC5wb3J0ID4gKiA+IC5wb3J0X3NoaXAgPiAuc2hpcF9ib3hbZGF0YS1sZW5ndGg9JyR7c2hpcExlbmd0aH0nXWAsXG4gICAgICApO1xuICAgIH0sXG4gICAgcGxhY2VSYW5kb20oc2hpcERhdGEpIHtcbiAgICAgIGNvbnN0IGNlbGxDb250ZW50ID0gdGhpcy5nZXRDZWxsQ29udGVudChzaGlwRGF0YS5jb29yZGluYXRlcyk7XG4gICAgICBjb25zdCBzaGlwQm94ID0gdGhpcy5nZXRTaGlwQm94KHNoaXBEYXRhLmxlbmd0aCk7XG4gICAgICBjb25zdCBuZXdPcmllbnRhdGlvbiA9IHNoaXBEYXRhLm9yaWVudGF0aW9uID8gJ3YnIDogJ2gnO1xuICAgICAgaWYgKHNoaXBCb3guZGF0YXNldC5vcmllbnRhdGlvbiAhPT0gbmV3T3JpZW50YXRpb24pIHtcbiAgICAgICAgc2hpcEJveC5kYXRhc2V0Lm9yaWVudGF0aW9uID0gbmV3T3JpZW50YXRpb247XG4gICAgICAgIGNvbnN0IG5ld1dpZHRoID0gbmV3T3JpZW50YXRpb24gPyBzaGlwQm94LnN0eWxlLndpZHRoIDogc2hpcEJveC5zdHlsZS5oZWlnaHQ7XG4gICAgICAgIGNvbnN0IG5ld0hlaWdodCA9IG5ld09yaWVudGF0aW9uID8gc2hpcEJveC5zdHlsZS5oZWlnaHQgOiBzaGlwQm94LnN0eWxlLndpZHRoO1xuICAgICAgICBjb25zdCBuZXdQYWRkaW5nUmlnaHQgPSBuZXdPcmllbnRhdGlvblxuICAgICAgICAgID8gc2hpcEJveC5zdHlsZS5wYWRkaW5nUmlnaHRcbiAgICAgICAgICA6IHNoaXBCb3guc3R5bGUucGFkZGluZ0JvdHRvbTtcbiAgICAgICAgY29uc3QgbmV3UGFkZGluZ0JvdHRvbSA9IG5ld09yaWVudGF0aW9uXG4gICAgICAgICAgPyBzaGlwQm94LnN0eWxlLnBhZGRpbmdCb3R0b21cbiAgICAgICAgICA6IHNoaXBCb3guc3R5bGUucGFkZGluZ1JpZ2h0O1xuICAgICAgICBzaGlwQm94LnN0eWxlLndpZHRoID0gbmV3T3JpZW50YXRpb24gPyBuZXdIZWlnaHQgOiBuZXdXaWR0aDtcbiAgICAgICAgc2hpcEJveC5zdHlsZS5oZWlnaHQgPSBuZXdPcmllbnRhdGlvbiA/IG5ld1dpZHRoIDogbmV3SGVpZ2h0O1xuICAgICAgICBzaGlwQm94LnN0eWxlLnBhZGRpbmdSaWdodCA9IG5ld09yaWVudGF0aW9uID8gbmV3UGFkZGluZ0JvdHRvbSA6IG5ld1BhZGRpbmdSaWdodDtcbiAgICAgICAgc2hpcEJveC5zdHlsZS5wYWRkaW5nQm90dG9tID0gbmV3T3JpZW50YXRpb24gPyBuZXdQYWRkaW5nUmlnaHQgOiBuZXdQYWRkaW5nQm90dG9tO1xuICAgICAgfVxuXG4gICAgICBwdWJTdWIucHVibGlzaChgcHVzaFNoaXBfJHt0aGlzLnBsYXllci5zdWJzdHJpbmcocGxheWVyLmluZGV4T2YoJ18nKSl9YCwge1xuICAgICAgICAuLi5zaGlwQm94LmRhdGFzZXQsXG4gICAgICAgIHN0eWxlOiBzaGlwQm94LnN0eWxlLmNzc1RleHQsXG4gICAgICB9KTtcbiAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKHNoaXBCb3gpO1xuXG4gICAgICB0aGlzLnBsYXllckJvYXJkLnBsYWNlU2hpcChcbiAgICAgICAgc2hpcERhdGEuY29vcmRpbmF0ZXMsXG4gICAgICAgIHNoaXBEYXRhLmxlbmd0aCxcbiAgICAgICAgc2hpcERhdGEub3JpZW50YXRpb24sXG4gICAgICAgIGZhbHNlLFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgc2hpcEJveC5kYXRhc2V0LmlkLFxuICAgICAgKTtcbiAgICB9LFxuICB9O1xuXG4gIHBvcnQuaW5pdCgpO1xuICByZXR1cm4gcG9ydC5yZW5kZXIoKTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAoc3RhdGUpID0+ICh7XG4gIHBsYXllcnNSZWFkeTogW10sXG4gIGluaXQoKSB7XG4gICAgY29uc29sZS5sb2coJ2luaXQgcnVubmluZyBmcm9tIGNvbXBvc2VHYW1lJyk7XG4gIH0sXG4gIGlzR2FtZVJlYWR5KHBsYXllciwgaXNSZWFkeSkge1xuICAgIGlmICh0aGlzLm1vZGUpIHtcbiAgICAgIC8vIElmIGh1bWFuIHZzIGh1bWFuXG4gICAgICBjb25zdCBpbmRleCA9IHRoaXMucGxheWVyc1JlYWR5LmluZGV4T2YocGxheWVyKTtcbiAgICAgIGlmIChpc1JlYWR5KSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHRoaXMucGxheWVyc1JlYWR5LnB1c2gocGxheWVyKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIHRoaXMucGxheWVyc1JlYWR5LnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucGxheUJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpbmFjdGl2ZScsIHRoaXMucGxheWVyc1JlYWR5Lmxlbmd0aCAhPT0gMik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIGh1bWFuIHZzIGNvbXB1dGVyXG4gICAgICBpZiAoaXNSZWFkeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuY29udGFpbnMoJ2luYWN0aXZlJykpIHtcbiAgICAgICAgICB0aGlzLnBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdpbmFjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdpbmFjdGl2ZScpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcGxheShlKSB7XG4gICAgaWYgKCF0aGlzLm1vZGUpIHtcbiAgICAgIHRoaXMuZ2FtZS5wbGF5ZXJUd28uYm9hcmQucGxhY2VTaGlwc1JhbmRvbSgndHdvJyk7XG4gICAgfVxuICAgIHRoaXMuZ2FtZVJlYWR5ID0gdHJ1ZTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICAgIHRoaXMucmVuZGVyV2FpdCgpO1xuICB9LFxufSk7XG4iLCJpbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcblxuZXhwb3J0IGRlZmF1bHQgKHN0YXRlKSA9PiAoe1xuICBpbml0KCkge30sXG4gIHVuYmluZEV2ZW50cygpIHtcbiAgICB0aGlzLnBsYXllck9uZUJvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgIHRoaXMucGxheWVyVHdvQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gIH0sXG4gIGdldEJ1dHRvbihbeCwgeV0pIHtcbiAgICAvLyBGaW5kIGJ1dHRvbiBvbiB0aGlzLmdhbWUuYWN0aXZlUGxheWVyJ3MgYm9hcmRcbiAgICAvLyBmb3Igd2hpY2ggaXQncyBkYXRhc2V0LnggPT09IHggYW5kIGRhdGFzZXQueSA9PT0geVxuICAgIGNvbnN0IGJvYXJkID0gW1xuICAgICAgLi4uKHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIgPT09IHRoaXMuZ2FtZS5wbGF5ZXJPbmVcbiAgICAgICAgPyB0aGlzLnBsYXllclR3b0JvYXJkXG4gICAgICAgIDogdGhpcy5wbGF5ZXJPbmVCb2FyZFxuICAgICAgKS5jaGlsZHJlbixcbiAgICBdLmZsYXRNYXAoKHJvdykgPT4gWy4uLnJvdy5jaGlsZHJlbl0pO1xuICAgIHJldHVybiBib2FyZC5maW5kKChidG4pID0+IGJ0bi5kYXRhc2V0LnggPT0geCAmJiBidG4uZGF0YXNldC55ID09IHkpO1xuICB9LFxuICByZW5kZXJBdHRhY2soY2VsbCwgY29vcmRpbmF0ZXMpIHtcbiAgICBjb25zdCBpc0FycmF5ID0gY29vcmRpbmF0ZXMuZXZlcnkoKGl0ZW0pID0+IEFycmF5LmlzQXJyYXkoaXRlbSkpO1xuXG4gICAgaWYgKGlzQXJyYXkpIHtcbiAgICAgIGNvb3JkaW5hdGVzLmZvckVhY2goKGNvb3JkaW5hdGUpID0+IHtcbiAgICAgICAgY29uc3QgYnV0dG9uID0gdGhpcy5nZXRCdXR0b24oY29vcmRpbmF0ZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKGJ1dHRvbik7XG4gICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdkb25lJyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYnV0dG9uID0gdGhpcy5nZXRCdXR0b24oY29vcmRpbmF0ZXMpO1xuICAgICAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoY2VsbC5taXNzID8gJ21pc3MnIDogJ2hpdCcpO1xuICAgIH1cbiAgfSxcbiAgcmVuZGVyV2FpdCgpIHtcbiAgICBsZXQgcGxheWVyID0gJ29uZSc7XG4gICAgaWYgKHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIgPT09IHRoaXMuZ2FtZS5wbGF5ZXJPbmUpIHtcbiAgICAgIC8vIElmIGdhbWUuYWN0aXZlUGxheWVyIGlzIE5PVCBwbGF5ZXJPbmVcbiAgICAgIC8vIFB1dCAnd2FpdCcgY2xhc3Mgb24gdGhlIHBsYXllciBvbmUncyBjb250YWluZXJcbiAgICAgIHRoaXMucGxheWVyT25lSGVhZGVyLnRleHRDb250ZW50ID0gYFlvdXIgZ3JpZGA7XG4gICAgICB0aGlzLnBsYXllclR3b0hlYWRlci50ZXh0Q29udGVudCA9IGBPcHBvbmVudCdzIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGxheWVyT25lSGVhZGVyLnRleHRDb250ZW50ID0gYE9wcG9uZW50J3MgZ3JpZGA7XG4gICAgICB0aGlzLnBsYXllclR3b0hlYWRlci50ZXh0Q29udGVudCA9IGBZb3VyIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVDb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICBwbGF5ZXIgPSAndHdvJztcbiAgICB9XG5cbiAgICBwdWJTdWIucHVibGlzaCgnbm90aWZ5JywgJ3R1cm4nLCBwbGF5ZXIpO1xuXG4gICAgaWYgKCF0aGlzLm1vZGUgJiYgdGhpcy5nYW1lLmFjdGl2ZVBsYXllciA9PT0gdGhpcy5nYW1lLnBsYXllclR3bykge1xuICAgICAgLy8gT3B0aW9uYWwsIHB1dCBhIHNldFRpbWVvdXQoKVxuICAgICAgdGhpcy5nYW1lLnBsYXlSb3VuZCgpO1xuICAgIH1cbiAgfSxcbiAgZW5kR2FtZShwbGF5ZXIpIHtcbiAgICB0aGlzLnVuYmluZEV2ZW50cygpO1xuICAgIHB1YlN1Yi5wdWJsaXNoKCdub3RpZnknLCAnZ2FtZW92ZXInLCBwbGF5ZXIpO1xuICB9LFxuICBib2FyZEhhbmRsZXIoZSkge1xuICAgIGNvbnN0IGJ0biA9IGUudGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3QgeCA9IHBhcnNlSW50KGJ0bi5kYXRhc2V0LngpO1xuICAgIGNvbnN0IHkgPSBwYXJzZUludChidG4uZGF0YXNldC55KTtcbiAgICBpZiAoIWlzTmFOKHgpIHx8ICFpc05hTih5KSkge1xuICAgICAgY29uc3QgY2VsbCA9IHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIub3Bwb25lbnRCb2FyZC5nZXRCb2FyZENlbGwoW3gsIHldKTtcbiAgICAgIGlmIChjZWxsLm1pc3MgPT09IGZhbHNlIHx8IGNlbGwuaGl0ID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLmdhbWUucGxheVJvdW5kKFt4LCB5XSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxufSk7XG4iLCJpbXBvcnQgR2FtZUNvbnRyb2xsZXIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9nYW1lQ29udHJvbGxlcic7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgY29tcG9zZUdhbWUgZnJvbSAnLi9jb21wb3NlR2FtZSc7XG5pbXBvcnQgcGxheUdhbWUgZnJvbSAnLi9wbGF5R2FtZSc7XG5pbXBvcnQgcG9ydCBmcm9tICcuLi9wb3J0L3BvcnQnO1xuaW1wb3J0IGJvYXJkIGZyb20gJy4uL2JvYXJkL2JvYXJkJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL3BvcnQuY3NzJztcblxuLy8gVHJ5aW5nIHRvIGRlY2lkZSB3aGV0aGVyIG9yIG5vdCBpdCBpcyBhIGdvb2QgaWRlYSB0byBjcmVhdGUgYSBzZXBhcmF0ZSBtb2R1bGVcbi8vIHRvIGNvbnRyb2wgdGhlIHNjcmVlbiBhZnRlciBwbGF5ZXJzIGhhdmUgcGxhY2VkIGFsbCB0aGVpciBzaGlwc1xuLy8gYW5kIGFmdGVyIGEgJ3N0YXJ0JyBidXR0b24gaXMgY2xpY2tlZFxuZXhwb3J0IGRlZmF1bHQgKG1vZGUpID0+IHtcbiAgLy8gQnVpbGRzIGVtcHR5IGJvYXJkIGZvciBwbGF5ZXJzIHRvIHBsYWNlIHRoZWlyIHNoaXBzXG4gIC8vIG1vZGUgPT09IHRydWUgPT4gaHVtYW4gdnMgaHVtYW5cbiAgLy8gbW9kZSA9PT0gZmFsc2UgPT4gaHVtYW4gdnMgY29tcHV0ZXJcblxuICBjb25zdCBzY3JlZW5Db250cm9sbGVyID0ge1xuICAgIG1vZGUsXG4gICAgZ2FtZVJlYWR5OiBmYWxzZSxcbiAgICBnYW1lOiBHYW1lQ29udHJvbGxlcihtb2RlKSxcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy5ib2FyZHMgPSB7XG4gICAgICAgIHBsYXllck9uZTogYm9hcmQoJ3BsYXllcl9vbmUnLCB0aGlzLmdhbWUucGxheWVyT25lQm9hcmQuYm9hcmQpLFxuICAgICAgICBwbGF5ZXJUd286IGJvYXJkKCdwbGF5ZXJfdHdvJywgdGhpcy5nYW1lLnBsYXllclR3b0JvYXJkLmJvYXJkKSxcbiAgICAgIH07XG4gICAgICBwdWJTdWIucHVibGlzaCgnbm90aWZ5JywgJ3BsYWNlJyk7XG4gICAgICB0aGlzLnVwZGF0ZUdhbWVTdGF0ZShjb21wb3NlR2FtZSk7XG4gICAgICB0aGlzLnBsYXkgPSB0aGlzLnBsYXkuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuaXNHYW1lUmVhZHkgPSB0aGlzLmlzR2FtZVJlYWR5LmJpbmQodGhpcyk7XG4gICAgfSxcbiAgICB1cGRhdGVHYW1lU3RhdGUoY2FsbGJhY2spIHtcbiAgICAgIE9iamVjdC5hc3NpZ24odGhpcywgY2FsbGJhY2soKSk7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmdhbWVDb250YWluZXIgPSBlbGVtZW50O1xuICAgICAgdGhpcy5ib2FyZENvbnRhaW5lciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignI2JvYXJkc19jb250YWluZXInKTtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZScpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfdHdvJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUJvYXJkID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZSA+IC5ib2FyZCcpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Cb2FyZCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl90d28gPiAuYm9hcmQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lSGVhZGVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZSA+IGg0Jyk7XG4gICAgICB0aGlzLnBsYXllclR3b0hlYWRlciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl90d28gPiBoNCcpO1xuICAgICAgdGhpcy5wbGF5QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheV9idG4nKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICBpZiAoIXRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIC8vIGlmICghdGhpcy5tb2RlKSB7XG4gICAgICAgIHRoaXMucGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucGxheSk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3BsYXllclJlYWR5JywgdGhpcy5pc0dhbWVSZWFkeSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIHRoaXMudXBkYXRlR2FtZVN0YXRlKHBsYXlHYW1lKTtcbiAgICAgICAgdGhpcy5yZW5kZXJBdHRhY2sgPSB0aGlzLnJlbmRlckF0dGFjay5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmVuZEdhbWUgPSB0aGlzLmVuZEdhbWUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJXYWl0ID0gdGhpcy5yZW5kZXJXYWl0LmJpbmQodGhpcyk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3JlbmRlckF0dGFjaycsIHRoaXMucmVuZGVyQXR0YWNrKTtcbiAgICAgICAgcHViU3ViLnN1YnNjcmliZSgnZW5kZ2FtZScsIHRoaXMuZW5kR2FtZSk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3JlbmRlcldhaXQnLCB0aGlzLnJlbmRlcldhaXQpO1xuICAgICAgICB0aGlzLmJvYXJkSGFuZGxlciA9IHRoaXMuYm9hcmRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB9XG4gICAgICB0aGlzLnBsYXllck9uZUJvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Cb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGdhbWVDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdzZWN0aW9uJyk7XG4gICAgICBjb25zdCBib2FyZHNDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IHBsYXllck9uZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgcGxheWVyVHdvQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBwbGF5ZXJPbmVIZWFkZXIgPSBjcmVhdGVFbGVtZW50KCdoNCcpO1xuICAgICAgY29uc3QgcGxheWVyVHdvSGVhZGVyID0gY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgICAgIGNvbnN0IGdhbWVQbGF5Q29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBnYW1lUGxheUJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgY29uc3QgZ2FtZVBsYXlCdG5UZXh0ID0gY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgZ2FtZVBsYXlCdG5UZXh0LnRleHRDb250ZW50ID0gJ1BsYXknO1xuICAgICAgZ2FtZUNvbnRhaW5lci5pZCA9ICdnYW1lX2NvbnRhaW5lcic7XG4gICAgICBib2FyZHNDb250YWluZXIuaWQgPSAnYm9hcmRzX2NvbnRhaW5lcic7XG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgncGxheWVyX29uZScpO1xuICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3BsYXllcl90d28nKTtcbiAgICAgIHBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBQbGF5ZXIgb25lJ3MgZ3JpZGA7XG4gICAgICBwbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgUGxheWVyIHR3bydzIGdyaWRgO1xuICAgICAgZ2FtZVBsYXlDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZ2FtZV9wbGF5Jyk7XG4gICAgICBnYW1lUGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdwbGF5X2J0bicpO1xuICAgICAgLy8gUmVuZGVycyBwbGF5ZXJzJyBib2FyZHNcbiAgICAgIC8vIHBsYXllck9uZUNvbnRhaW5lci5hcHBlbmRDaGlsZChib2FyZCgncGxheWVyX29uZScsIHRoaXMuYm9hcmRzLnBsYXllck9uZSkpO1xuICAgICAgLy8gcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKGJvYXJkKCdwbGF5ZXJfdHdvJywgdGhpcy5ib2FyZHMucGxheWVyVHdvKSk7XG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5ib2FyZHMucGxheWVyT25lLnJlbmRlcigpKTtcbiAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmJvYXJkcy5wbGF5ZXJUd28ucmVuZGVyKCkpO1xuICAgICAgcGxheWVyT25lQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllck9uZUhlYWRlcik7XG4gICAgICBwbGF5ZXJUd29Db250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyVHdvSGVhZGVyKTtcbiAgICAgIGJvYXJkc0NvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJPbmVDb250YWluZXIpO1xuICAgICAgYm9hcmRzQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllclR3b0NvbnRhaW5lcik7XG4gICAgICBnYW1lUGxheUJ0bi5hcHBlbmRDaGlsZChnYW1lUGxheUJ0blRleHQpO1xuICAgICAgZ2FtZVBsYXlDb250YWluZXIuYXBwZW5kQ2hpbGQoZ2FtZVBsYXlCdG4pO1xuICAgICAgaWYgKCF0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICBwbGF5ZXJPbmVDb250YWluZXIuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgcG9ydCgncGxheWVyX29uZScsIHRoaXMuZ2FtZSwgdGhpcy5tb2RlLCB0aGlzLmJvYXJkcy5wbGF5ZXJPbmUpLFxuICAgICAgICApO1xuICAgICAgICBwbGF5ZXJUd29Db250YWluZXIuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgcG9ydCgncGxheWVyX3R3bycsIHRoaXMuZ2FtZSwgdGhpcy5tb2RlLCB0aGlzLmJvYXJkcy5wbGF5ZXJUd28pLFxuICAgICAgICApO1xuICAgICAgICBpZiAodGhpcy5tb2RlKSB7XG4gICAgICAgICAgZ2FtZVBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaW5hY3RpdmUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5hY3RpdmUnKTtcbiAgICAgICAgICBwbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2FpdCcpO1xuICAgICAgICB9XG4gICAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZChnYW1lUGxheUNvbnRhaW5lcik7XG4gICAgICB9XG5cbiAgICAgIGdhbWVDb250YWluZXIuYXBwZW5kQ2hpbGQoYm9hcmRzQ29udGFpbmVyKTtcbiAgICAgIGlmICh0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICB0aGlzLmdhbWVDb250YWluZXIucmVwbGFjZVdpdGgoZ2FtZUNvbnRhaW5lcik7XG4gICAgICAgIGJvYXJkc0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdidXN5Jyk7XG4gICAgICB9XG4gICAgICB0aGlzLmNhY2hlRE9NKGdhbWVDb250YWluZXIpO1xuICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG4gICAgICBpZiAoIXRoaXMuZ2FtZVJlYWR5KSByZXR1cm4gZ2FtZUNvbnRhaW5lcjtcbiAgICB9LFxuICB9O1xuICBzY3JlZW5Db250cm9sbGVyLmluaXQoKTtcbiAgcmV0dXJuIHNjcmVlbkNvbnRyb2xsZXIucmVuZGVyKCk7XG59O1xuIiwiaW1wb3J0IEdhbWVib2FyZCBmcm9tICcuL2dhbWVib2FyZCc7XG5pbXBvcnQgUGxheWVyIGZyb20gJy4vcGxheWVyJztcbmltcG9ydCBwaXBlIGZyb20gJy4vcGlwZSc7XG5pbXBvcnQgaXNIdW1hbiBmcm9tICcuL2lzSHVtYW4nO1xuaW1wb3J0IGlzQ29tcHV0ZXIgZnJvbSAnLi9pc0NvbXB1dGVyJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi9wdWJTdWInO1xuLy8gTW9kdWxlIHRoYXQgY29udHJvbHMgdGhlIG1haW4gZ2FtZSBsb29wXG4vLyBGb3Igbm93IGp1c3QgcG9wdWxhdGUgZWFjaCBHYW1lYm9hcmQgd2l0aCBwcmVkZXRlcm1pbmVkIGNvb3JkaW5hdGVzLlxuLy8gWW91IGFyZSBnb2luZyB0byBpbXBsZW1lbnQgYSBzeXN0ZW0gZm9yIGFsbG93aW5nIHBsYXllcnMgdG8gcGxhY2UgdGhlaXIgc2hpcHMgbGF0ZXIuXG5leHBvcnQgZGVmYXVsdCAobW9kZSkgPT4ge1xuICAvLyBJZiBtb2RlIGlzIHRydWUgcGxheWVyIHR3byB3aWxsIGJlIGEgaHVtYW4sIGVsc2UgYSBjb21wdXRlclxuICAvLyBUaGUgZ2FtZSBsb29wIHNob3VsZCBzZXQgdXAgYSBuZXcgZ2FtZSBieSBjcmVhdGluZyBQbGF5ZXJzIGFuZCBHYW1lYm9hcmRzLlxuICAvLyAxLiBDcmVhdGUgZ2FtZWJvYXJkc1xuICAvLyAyLiBDcmVhdGUgcGxheWVycyBhbmQgcGFzcyBpbiB0aGVpciBnYW1lYm9hcmQgYW5kIHRoZSBvcHBvbmVudCdzIGdhbWVib2FyZC5cbiAgLy8gIERvIEkgb25seSBuZWVkIHRvIHBhc3MgdGhlIG9wcG9uZW50J3MgYm9hcmQ/XG4gIC8vIGxldCBhY3RpdmVQbGF5ZXI7XG4gIGNvbnN0IHBsYXllck9uZUJvYXJkID0gR2FtZWJvYXJkKCk7XG4gIGNvbnN0IHBsYXllclR3b0JvYXJkID0gR2FtZWJvYXJkKCk7XG5cbiAgY29uc3QgcGxheWVyT25lID0gcGlwZShQbGF5ZXIsIGlzSHVtYW4pKHBsYXllck9uZUJvYXJkLCBwbGF5ZXJUd29Cb2FyZCk7XG4gIGNvbnN0IHBsYXllclR3byA9IHBpcGUoUGxheWVyLCBtb2RlID8gaXNIdW1hbiA6IGlzQ29tcHV0ZXIpKHBsYXllclR3b0JvYXJkLCBwbGF5ZXJPbmVCb2FyZCk7XG5cbiAgY29uc3QgcGxheWVycyA9IFtwbGF5ZXJPbmUsIHBsYXllclR3b107XG4gIGxldCBhY3RpdmVQbGF5ZXIgPSBwbGF5ZXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpXTtcblxuICBjb25zdCBzd2l0Y2hQbGF5ZXJzID0gKHBsYXllcikgPT4ge1xuICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgIC8vIExvb2tpbmcgaW50byBMb2Rhc2ggXy5pc0VxdWFsKClcbiAgICAgIC8vIENvdWxkIGFkZCBhIHR1cm4gcHJvcGVydHkgdG8gcGxheWVyIG9iamVjdCB0aGF0IHRha2VzIGEgYm9vbGVhblxuICAgICAgYWN0aXZlUGxheWVyID0gcGxheWVyID09PSBwbGF5ZXJPbmUgPyBwbGF5ZXJUd28gOiBwbGF5ZXJPbmU7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHBsYXlSb3VuZCA9IChjb29yZGluYXRlKSA9PiB7XG4gICAgLy8gQWxsb3cgYSBwbGF5ZXIgdG8gYXR0YWNrIGFnYWluIGlmIHRoZSBpbml0aWFsIGF0dGFjayBoaXRzIGEgc2hpcFxuICAgIGFjdGl2ZVBsYXllci5hdHRhY2soY29vcmRpbmF0ZSk7XG5cbiAgICBjb25zdCBzdGF0dXMgPSBnZXRHYW1lU3RhdHVzKCk7XG4gICAgaWYgKCFzdGF0dXMuc3RhdHVzKSB7XG4gICAgICAvLyBJZiBnYW1lIGlzIG5vdCBvdmVyLCBzd2l0Y2ggcGxheWVyc1xuICAgICAgc3dpdGNoUGxheWVycyhhY3RpdmVQbGF5ZXIpO1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ3JlbmRlcldhaXQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ2VuZGdhbWUnLCBzdGF0dXMucGxheWVyKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZ2V0R2FtZVN0YXR1cyA9ICgpID0+IHtcbiAgICBjb25zdCBzdGF0dXMgPSB7IHN0YXR1czogcGxheWVyT25lQm9hcmQuZ2V0U3RhdHVzKCkgfHwgcGxheWVyVHdvQm9hcmQuZ2V0U3RhdHVzKCkgfTtcbiAgICBpZiAoc3RhdHVzLnN0YXR1cykge1xuICAgICAgLy8gR2FtZSBpcyBvdmVyXG4gICAgICBjb25zdCBwbGF5ZXIgPSBwbGF5ZXJPbmVCb2FyZC5nZXRTdGF0dXMoKSA/ICd0d28nIDogJ29uZSc7XG4gICAgICBPYmplY3QuYXNzaWduKHN0YXR1cywgeyBwbGF5ZXIgfSk7XG4gICAgfVxuICAgIHJldHVybiBzdGF0dXM7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBzd2l0Y2hQbGF5ZXJzLFxuICAgIHBsYXlSb3VuZCxcbiAgICBnZXRHYW1lU3RhdHVzLFxuICAgIGdldCBhY3RpdmVQbGF5ZXIoKSB7XG4gICAgICByZXR1cm4gYWN0aXZlUGxheWVyO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllck9uZSgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJPbmU7XG4gICAgfSxcbiAgICBnZXQgcGxheWVyVHdvKCkge1xuICAgICAgcmV0dXJuIHBsYXllclR3bztcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJPbmVCb2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJPbmVCb2FyZDtcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJUd29Cb2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJUd29Cb2FyZDtcbiAgICB9LFxuICB9O1xufTtcbiIsImltcG9ydCBTaGlwIGZyb20gJy4uL2NvbnRhaW5lcnMvc2hpcCc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4vcHViU3ViJztcbmltcG9ydCBnZW5lcmF0ZVVVSUQgZnJvbSAnLi4vaGVscGVycy9nZW5lcmF0ZVVVSUQnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIC8vIEtlZXAgdHJhY2sgb2YgbWlzc2VkIGF0dGFja3Mgc28gdGhleSBjYW4gZGlzcGxheSB0aGVtIHByb3Blcmx5LlxuICAvLyBCZSBhYmxlIHRvIHJlcG9ydCB3aGV0aGVyIG9yIG5vdCBhbGwgb2YgdGhlaXIgc2hpcHMgaGF2ZSBiZWVuIHN1bmsuXG4gIC8vIFRoZSBtZW1vIGFycmF5IHN0b3JlcyBhIENlbGwncyByZWZlcmVuY2VzIHRoYXQgcmVzZW1ibGUgd2hlcmUgc2hpcHMgaGF2ZSBiZWVuIHBsYWNlZC5cbiAgLy8gVGhlIG1lbW8gYXJyYXkgaXMgdXNlZCBpbiB0aGUgbWV0aG9kcyBjbGVhckJvYXJkIGFuZCBwbGFjZVNoaXBcbiAgY29uc3QgbWVtbyA9IFtdO1xuICBjb25zdCBDZWxsID0gKHNoaXApID0+IHtcbiAgICByZXR1cm4gc2hpcFxuICAgICAgPyB7XG4gICAgICAgICAgc2hpcCxcbiAgICAgICAgICBoaXQ6IGZhbHNlLFxuICAgICAgICAgIGF0dGFjaygpIHtcbiAgICAgICAgICAgIHRoaXMuaGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc2hpcC5oaXQoKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgICA6IHtcbiAgICAgICAgICBtaXNzOiBmYWxzZSxcbiAgICAgICAgICBhdHRhY2soKSB7XG4gICAgICAgICAgICB0aGlzLm1pc3MgPSB0cnVlO1xuICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gIH07XG4gIGNvbnN0IGJvYXJkID0gbmV3IEFycmF5KDEwKS5maWxsKCkubWFwKCgpID0+IG5ldyBBcnJheSgxMCkuZmlsbCgpLm1hcCgoKSA9PiBDZWxsKCkpKTtcblxuICBjb25zdCBjbGVhckJvYXJkID0gKCkgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWVtby5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgY29uc3QgeyByb3csIGNvbCB9ID0gbWVtb1tpXTtcbiAgICAgIGJvYXJkW3Jvd11bY29sXSA9IENlbGwoKTtcbiAgICAgIG1lbW8uc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBwYXJzZUNvb3JkaW5hdGUgPSAoW3gsIHldKSA9PiB7XG4gICAgLy8gUGFyc2VzIGNvb3JkaW5hdGUgaW5wdXR0ZWQgYnkgdXNlciBzdWNoIHRoYXRcbiAgICAvLyB0aGUgdmFsdWUgcGFpcnMgY2FuIGJlIHVzZWQgZm9yIGFjY2Vzc2luZyBlbGVtZW50c1xuICAgIC8vIGluIHRoZSB0d28gZGltZW5zaW9uYWwgYXJyYXlcbiAgICByZXR1cm4gW2JvYXJkLmxlbmd0aCAtIHksIHggLSAxXTtcbiAgfTtcblxuICBjb25zdCB1bnBhcnNlQ29vcmRpbmF0ZSA9IChbeCwgeV0pID0+IHtcbiAgICByZXR1cm4gW3kgKyAxLCBib2FyZC5sZW5ndGggLSB4XTtcbiAgfTtcblxuICBjb25zdCBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGUgPSAoKSA9PiB7XG4gICAgLy8gUmV0dXJucyByYW5kb20gY29vcmRpbmF0ZSB3aXRoIHZhbHVlcyBiZXR3ZWVuIDEgYW5kIDEwXG4gICAgY29uc3QgY29vcmRpbmF0ZSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMjsgaSArPSAxKSB7XG4gICAgICBjb29yZGluYXRlLnB1c2goTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAgKyAxKSk7XG4gICAgfVxuICAgIHJldHVybiBjb29yZGluYXRlO1xuICB9O1xuXG4gIGNvbnN0IGdlbmVyYXRlU2hpcENvb3JkaW5hdGVzID0gKFt4LCB5XSwgb3JpZW50YXRpb24sIHNoaXBMZW5ndGgpID0+IHtcbiAgICBjb25zdCBjb29yZGluYXRlcyA9IFtdO1xuXG4gICAgaWYgKG9yaWVudGF0aW9uKSB7XG4gICAgICAvLyBWZXJ0aWNhbFxuICAgICAgZm9yIChsZXQgaSA9IHg7IGkgPCB4ICsgc2hpcExlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvb3JkaW5hdGVzLnB1c2goW2ksIHldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSG9yaXpvbnRhbFxuICAgICAgZm9yIChsZXQgaSA9IHk7IGkgPCB5ICsgc2hpcExlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvb3JkaW5hdGVzLnB1c2goW3gsIGldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29vcmRpbmF0ZXM7XG4gIH07XG5cbiAgY29uc3QgdmFsaWRhdGVDb29yZGluYXRlID0gKHgsIHkpID0+IHtcbiAgICByZXR1cm4geCA+PSAwICYmIHggPCAxMCAmJiB5ID49IDAgJiYgeSA8IDEwO1xuICB9O1xuXG4gIGNvbnN0IGNoZWNrQm9hcmQgPSAoW3gsIHldLCBpZCkgPT4ge1xuICAgIC8vIENoZWNrIGlmIHRoZXJlIGlzIGEgc2hpcCBhdCB4IGFuZCB5XG4gICAgLy8gQ2hlY2sgaWYgYWxsIHN1cnJvdW5kaW5nIGNvb3JkaW5hdGVzIGFyZSB1bmRlZmluZWRcbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiBzaGlwIGNhbiBiZSBwbGFjZVxuICAgIGNvbnN0IGJvb2xlYW4gPSB2YWxpZGF0ZUNvb3JkaW5hdGUoeCwgeSk7XG4gICAgY29uc3QgY2hlY2sgPSBbXG4gICAgICBbeCwgeV0sXG4gICAgICBbeCwgeSArIDFdLFxuICAgICAgW3gsIHkgLSAxXSxcbiAgICAgIFt4ICsgMSwgeV0sXG4gICAgICBbeCArIDEsIHkgKyAxXSxcbiAgICAgIFt4ICsgMSwgeSAtIDFdLFxuICAgICAgW3ggLSAxLCB5XSxcbiAgICAgIFt4IC0gMSwgeSArIDFdLFxuICAgICAgW3ggLSAxLCB5IC0gMV0sXG4gICAgXTtcbiAgICByZXR1cm4gY2hlY2suZXZlcnkoKFthLCBiXSkgPT4ge1xuICAgICAgLy8gTmVlZCB0byBjaGVjayBpZiBhIGFuZCBiIGFyZSB3aXRoaW4gdGhlIGJvYXJkJ3Mgc2l6ZVxuICAgICAgLy8gVGhlIHZhbHVlIG9mIGEgYW5kIGIgY2FuIG9ubHkgYmUgYmV0d2VlbiBmcm9tIDAgdG8gOS5cbiAgICAgIC8vIEl0IGlzIHBvaW50bGVzcyB0byBjaGVjayBpZiB0aGVyZSBpcyBzcGFjZSB3aGVuIGEgc2hpcCBpcyBwbGFjZWQgYXQgdGhlIGJvcmRlciBvZiB0aGUgYm9hcmRcbiAgICAgIHJldHVybiB2YWxpZGF0ZUNvb3JkaW5hdGUoYSwgYilcbiAgICAgICAgPyBib29sZWFuICYmIChib2FyZFthXVtiXS5zaGlwID09PSB1bmRlZmluZWQgfHwgYm9hcmRbYV1bYl0uc2hpcC5pZCA9PT0gaWQpXG4gICAgICAgIDogYm9vbGVhbjtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBwbGFjZVNoaXAgPSAoXG4gICAgY29vcmRpbmF0ZXMsXG4gICAgc2hpcExlbmd0aCxcbiAgICBvcmllbnRhdGlvbixcbiAgICBpc0RyYWdnaW5nLFxuICAgIGlzUm90YXRpbmcsXG4gICAgaWQsXG4gICAgZHJvcFN1YnNjcmliZXIsXG4gICAgcm90YXRlU3Vic2NyaWJlcixcbiAgKSA9PiB7XG4gICAgLy8gSG93IG1hbnkgcGFyYW1ldGVycyBpcyB0b28gbXVjaD9cblxuICAgIGNvbnN0IFt4LCB5XSA9IHBhcnNlQ29vcmRpbmF0ZShjb29yZGluYXRlcyk7XG4gICAgY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMoW3gsIHldLCBvcmllbnRhdGlvbiwgc2hpcExlbmd0aCk7XG4gICAgY29uc3QgaXNWYWxpZENvb3JkaW5hdGVzID0gc2hpcENvb3JkaW5hdGVzLmV2ZXJ5KChjb29yZGluYXRlKSA9PiB7XG4gICAgICByZXR1cm4gY2hlY2tCb2FyZChjb29yZGluYXRlLCBpZCk7XG4gICAgfSk7XG5cbiAgICBpZiAoaXNWYWxpZENvb3JkaW5hdGVzICYmICFpc0RyYWdnaW5nKSB7XG4gICAgICBjb25zdCBuZXdTaGlwID0gU2hpcChzaGlwTGVuZ3RoLCBpZCk7XG4gICAgICAvLyBDaGVjayBpZiB4IGFuZCB5IGFyZSB3aXRoaW4gdGhlIGJvYXJkJ3Mgc2l6ZVxuICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgYSBzaGlwIGF0IHggYW5kIHlcbiAgICAgIGNvbnN0IGlzU2hpcE9uQm9hcmQgPSBtZW1vLnNvbWUoKGNlbGwpID0+IGNlbGwuaWQgPT09IGlkICYmIGlkICE9PSB1bmRlZmluZWQpO1xuICAgICAgaWYgKGlzU2hpcE9uQm9hcmQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW1vLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgaWYgKG1lbW9baV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgICBjb25zdCB7IHJvdywgY29sIH0gPSBtZW1vW2ldO1xuICAgICAgICAgICAgYm9hcmRbcm93XVtjb2xdID0gQ2VsbCgpO1xuICAgICAgICAgICAgbWVtby5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBpIC09IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChvcmllbnRhdGlvbikge1xuICAgICAgICAvLyBWZXJ0aWNhbFxuICAgICAgICBmb3IgKGxldCBpID0geDsgaSA8IHggKyBuZXdTaGlwLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgYm9hcmRbaV1beV0gPSBDZWxsKG5ld1NoaXApO1xuICAgICAgICAgIG1lbW8ucHVzaCh7IHJvdzogaSwgY29sOiB5LCBpZCB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSG9yaXpvbnRhbFxuICAgICAgICBmb3IgKGxldCBpID0geTsgaSA8IHkgKyBuZXdTaGlwLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgYm9hcmRbeF1baV0gPSBDZWxsKG5ld1NoaXApO1xuICAgICAgICAgIG1lbW8ucHVzaCh7IHJvdzogeCwgY29sOiBpLCBpZCB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoaXNSb3RhdGluZykge1xuICAgICAgICBwdWJTdWIucHVibGlzaChyb3RhdGVTdWJzY3JpYmVyLCB0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHB1YlN1Yi5wdWJsaXNoKGRyb3BTdWJzY3JpYmVyLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZhbGlkQ29vcmRpbmF0ZXMgJiYgaXNEcmFnZ2luZyAmJiAhaXNSb3RhdGluZykge1xuICAgICAgLy8gRHJhZ2dhYmxlIHN0aWxsIGRyYWdnaW5nIGFuZCB2YWxpZCBwbGFjZW1lbnRcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKGRyb3BTdWJzY3JpYmVyLCB0cnVlLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKCFpc1ZhbGlkQ29vcmRpbmF0ZXMgJiYgaXNEcmFnZ2luZyAmJiAhaXNSb3RhdGluZykge1xuICAgICAgLy8gRHJhZ2dhYmxlIHN0aWxsIGRyYWdnaW5nIGFuZCBpbnZhbGlkIHBsYWNlbWVudFxuICAgICAgcHViU3ViLnB1Ymxpc2goZHJvcFN1YnNjcmliZXIsIHRydWUsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKCFpc1ZhbGlkQ29vcmRpbmF0ZXMgJiYgIWlzRHJhZ2dpbmcgJiYgaXNSb3RhdGluZykge1xuICAgICAgLy8gRHJhZ2dhYmxlIGlzIG5vdCBkcmFnZ2luZywgaW52YWxpZCBwbGFjZW1lbnQsIGFuZCBmYWlscyB0byByb3RhdGVcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKHJvdGF0ZVN1YnNjcmliZXIsIGZhbHNlKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgcGxhY2VTaGlwc1JhbmRvbSA9IChwbGF5ZXIpID0+IHtcbiAgICBjb25zdCBzaGlwcyA9IFs0LCAzLCAzLCAyLCAyLCAyLCAxLCAxLCAxLCAxXTtcbiAgICBjb25zdCBjb29yZGluYXRlcyA9IFtdO1xuICAgIGxldCBpID0gMDtcblxuICAgIHdoaWxlIChpIDwgc2hpcHMubGVuZ3RoKSB7XG4gICAgICBjb25zdCBbeCwgeV0gPSBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGUoKTtcbiAgICAgIGNvbnN0IFtwYXJzZWRYLCBwYXJzZWRZXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyKSA9PT0gMTtcbiAgICAgIGNvbnN0IGxlbmd0aCA9IHNoaXBzW2ldO1xuICAgICAgY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMoW3BhcnNlZFgsIHBhcnNlZFldLCBvcmllbnRhdGlvbiwgbGVuZ3RoKTtcbiAgICAgIGNvbnN0IGlzVmFsaWRDb29yZGluYXRlID0gc2hpcENvb3JkaW5hdGVzLmV2ZXJ5KGNoZWNrQm9hcmQpO1xuICAgICAgaWYgKCFjb29yZGluYXRlcy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkgJiYgaXNWYWxpZENvb3JkaW5hdGUpIHtcbiAgICAgICAgLy8gcGxhY2VTaGlwKFt4LCB5XSwgbGVuZ3RoLCBvcmllbnRhdGlvbiwgZmFsc2UsIGZhbHNlLCBnZW5lcmF0ZVVVSUQoKSk7XG4gICAgICAgIHB1YlN1Yi5wdWJsaXNoKGBwbGFjZVJhbmRvbV8ke3BsYXllcn1gLCB7XG4gICAgICAgICAgY29vcmRpbmF0ZXM6IFt4LCB5XSxcbiAgICAgICAgICBsZW5ndGg6IGxlbmd0aCxcbiAgICAgICAgICBvcmllbnRhdGlvbixcbiAgICAgICAgfSk7XG4gICAgICAgIGNvb3JkaW5hdGVzLnB1c2goW3gsIHldKTtcbiAgICAgICAgaSArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBjb25zdCBzaG90cyA9IFtdO1xuICBjb25zdCB2YWxpZGF0ZUF0dGFjayA9ICh4LCB5KSA9PiB7XG4gICAgLy8gQ2hlY2tzIGlmIGNvb3JkaW5hdGUgaXMgd2l0aCB0aGUgYm9hcmQgc2l6ZSBhbmQgaGFzIG5vdCBiZWVuIGF0dGFja2VkXG4gICAgY29uc3QgW2EsIGJdID0gcGFyc2VDb29yZGluYXRlKFt4LCB5XSk7XG4gICAgcmV0dXJuICFzaG90cy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkgJiYgdmFsaWRhdGVDb29yZGluYXRlKGEsIGIpO1xuICB9O1xuXG4gIGNvbnN0IHJlY2VpdmVBdHRhY2sgPSAoW3gsIHldKSA9PiB7XG4gICAgLy8gSGF2ZSBhIHJlY2VpdmVBdHRhY2sgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIHBhaXIgb2YgY29vcmRpbmF0ZXNcbiAgICAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRoZSBhdHRhY2sgaGl0IGEgc2hpcFxuICAgIC8vIFRoZW4gc2VuZHMgdGhlIOKAmGhpdOKAmSBmdW5jdGlvbiB0byB0aGUgY29ycmVjdCBzaGlwLCBvciByZWNvcmRzIHRoZSBjb29yZGluYXRlcyBvZiB0aGUgbWlzc2VkIHNob3QuXG4gICAgY29uc3QgY2VsbCA9IGdldEJvYXJkQ2VsbChbeCwgeV0pO1xuICAgIGNvbnN0IGlzVmFsaWRBdHRhY2sgPSB2YWxpZGF0ZUF0dGFjayh4LCB5KTtcblxuICAgIGlmIChpc1ZhbGlkQXR0YWNrKSB7XG4gICAgICBjZWxsLmF0dGFjaygpO1xuICAgICAgc2hvdHMucHVzaChbeCwgeV0pO1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ3JlbmRlckF0dGFjaycsIGNlbGwsIFt4LCB5XSk7XG4gICAgICBjb25zdCBzaGlwID0gY2VsbC5zaGlwO1xuICAgICAgaWYgKHNoaXAgJiYgc2hpcC5pc1N1bmsoKSkge1xuICAgICAgICAvLyBOZWVkIHRvIGZpbmQgYWxsIGNvb3JkaW5hdGVzIGZvciB0aGUgc2hpcFxuICAgICAgICAvLyBjb25zdCBzaGlwQ29vcmRpbmF0ZXMgPSBtZW1vLmZpbHRlcigoc2hpcE1lbW8pID0+IHNoaXBNZW1vLmlkID09PSBzaGlwLmlkKTtcbiAgICAgICAgY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gbWVtby5yZWR1Y2UoKGFjY3VtdWxhdG9yLCBjdXJyZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGN1cnJlbnQuaWQgPT09IHNoaXAuaWQpIHtcbiAgICAgICAgICAgIGFjY3VtdWxhdG9yLnB1c2godW5wYXJzZUNvb3JkaW5hdGUoW2N1cnJlbnQucm93LCBjdXJyZW50LmNvbF0pKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIHB1YlN1Yi5wdWJsaXNoKCdyZW5kZXJBdHRhY2snLCBjZWxsLCBzaGlwQ29vcmRpbmF0ZXMpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBjb25zdCBnZXRTdGF0dXMgPSAoKSA9PiB7XG4gICAgLy8gUmVwb3J0cyB3aGV0aGVyIG9yIG5vdCBhbGwgb2YgdGhlaXIgc2hpcHMgaGF2ZSBiZWVuIHN1bmsuXG4gICAgY29uc3QgZmxhdEJvYXJkID0gYm9hcmQuZmxhdCgpLmZpbHRlcigoY2VsbCkgPT4gY2VsbC5zaGlwICE9PSB1bmRlZmluZWQpO1xuICAgIHJldHVybiBmbGF0Qm9hcmQuZXZlcnkoKGNlbGwpID0+IGNlbGwuc2hpcC5pc1N1bmsoKSk7XG4gIH07XG5cbiAgY29uc3QgZ2V0Qm9hcmRDZWxsID0gKFt4LCB5XSkgPT4ge1xuICAgIGNvbnN0IFthLCBiXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgIHJldHVybiBib2FyZFthXVtiXTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHJlY2VpdmVBdHRhY2ssXG4gICAgcGxhY2VTaGlwLFxuICAgIHBsYWNlU2hpcHNSYW5kb20sXG4gICAgZ2V0U3RhdHVzLFxuICAgIGdldEJvYXJkQ2VsbCxcbiAgICBjbGVhckJvYXJkLFxuICAgIGdldCBib2FyZCgpIHtcbiAgICAgIHJldHVybiBib2FyZDtcbiAgICB9LFxuICB9O1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IChwbGF5ZXIpID0+IHtcbiAgLy8gTWFrZSB0aGUg4oCYY29tcHV0ZXLigJkgY2FwYWJsZSBvZiBtYWtpbmcgcmFuZG9tIHBsYXlzLlxuICAvLyBUaGUgQUkgZG9lcyBub3QgaGF2ZSB0byBiZSBzbWFydCxcbiAgLy8gQnV0IGl0IHNob3VsZCBrbm93IHdoZXRoZXIgb3Igbm90IGEgZ2l2ZW4gbW92ZSBpcyBsZWdhbFxuICAvLyAoaS5lLiBpdCBzaG91bGRu4oCZdCBzaG9vdCB0aGUgc2FtZSBjb29yZGluYXRlIHR3aWNlKS5cblxuICBjb25zdCBzaG90cyA9IFtdO1xuICBjb25zdCBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGUgPSAoKSA9PiB7XG4gICAgLy8gUmV0dXJucyByYW5kb20gY29vcmRpbmF0ZSB3aXRoIHZhbHVlcyBiZXR3ZWVuIDEgYW5kIDEwXG4gICAgY29uc3QgY29vcmRpbmF0ZSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMjsgaSArPSAxKSB7XG4gICAgICBjb29yZGluYXRlLnB1c2goTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAgKyAxKSk7XG4gICAgfVxuICAgIHJldHVybiBjb29yZGluYXRlO1xuICB9O1xuXG4gIGNvbnN0IGF0dGFjayA9ICgpID0+IHtcbiAgICAvLyBSZXR1cm5zIGEgcmFuZG9tIHVuaXF1ZSBjb29yZGluYXRlIHRoYXQgaXMgaW4tYm91bmRzIG9mIHRoZSBib2FyZFxuICAgIC8vIE5vdGUsIGlmIHNob3RzLmxlbmd0aCBpcyAxMDAsIGdhbWUgd2lsbCBiZSBvdmVyXG4gICAgLy8gVGhlcmUgYXJlIG9ubHkgMTAwIGNvb3JkaW5hdGVzIHRvIGF0dGFja1xuICAgIHdoaWxlIChzaG90cy5sZW5ndGggPCAxMDApIHtcbiAgICAgIGxldCBbeCwgeV0gPSBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGUoKTtcbiAgICAgIGlmICghc2hvdHMuZmluZCgoW2EsIGJdKSA9PiBhID09PSB4ICYmIGIgPT09IHkpKSB7XG4gICAgICAgIHBsYXllci5vcHBvbmVudEJvYXJkLnJlY2VpdmVBdHRhY2soW3gsIHldKTtcbiAgICAgICAgc2hvdHMucHVzaChbeCwgeV0pO1xuICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4geyBhdHRhY2sgfTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAocGxheWVyKSA9PiAoe1xuICBhdHRhY2s6IChbeCwgeV0pID0+IHtcbiAgICBwbGF5ZXIub3Bwb25lbnRCb2FyZC5yZWNlaXZlQXR0YWNrKFt4LCB5XSk7XG4gICAgcmV0dXJuIFt4LCB5XTtcbiAgfSxcbn0pO1xuIiwiLy8gQXJ0aWNsZXMgYWJvdXQgbG9vc2VseSBjb3VwbGluZyBvYmplY3QgaW5oZXJpdGFuY2Ugd2l0aCBmYWN0b3J5IGZ1bmN0aW9ucyBhbmQgcGlwZVxuLy8gaHR0cHM6Ly9tZWRpdW0uY29tL2RhaWx5anMvYnVpbGRpbmctYW5kLWNvbXBvc2luZy1mYWN0b3J5LWZ1bmN0aW9ucy01MGZlOTAxNDEzNzRcbi8vIGh0dHBzOi8vd3d3LmZyZWVjb2RlY2FtcC5vcmcvbmV3cy9waXBlLWFuZC1jb21wb3NlLWluLWphdmFzY3JpcHQtNWIwNDAwNGFjOTM3L1xuLy8gT2JzZXJ2YXRpb246IGlmIHRoZXJlIGlzIG5vIGluaXRpYWwgdmFsdWUsIHRoZSBmaXJzdCBmdW5jdGlvbiBkb2VzIG5vdCBydW5cbmV4cG9ydCBkZWZhdWx0IChpbml0aWFsRm4sIC4uLmZucykgPT5cbiAgKC4uLnZhbHVlcykgPT4ge1xuICAgIHJldHVybiBmbnMucmVkdWNlKChvYmosIGZuKSA9PiB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIGZuKG9iaikpO1xuICAgIH0sIGluaXRpYWxGbih2YWx1ZXMpKTtcbiAgfTtcbiIsIi8vIFBsYXllcnMgY2FuIHRha2UgdHVybnMgcGxheWluZyB0aGUgZ2FtZSBieSBhdHRhY2tpbmcgdGhlIGVuZW15IEdhbWVib2FyZC5cbi8vIFRoZSBnYW1lIGlzIHBsYXllZCBhZ2FpbnN0IHRoZSBjb21wdXRlcixcblxuLy8gRG9lcyBlYWNoIHBsYXllciBoYXZlIHRoZWlyIG93biBnYW1lYm9hcmQ/XG4vLyBEb2VzIGVhY2ggcGxheWVyIGhhdmUgYWNjZXNzIHRvIHRoZSBvcHBvbmVudCdzIGdhbWVib2FyZD9cbi8vIEhvdyB0byBkZWNpZGUgaWYgZ2FtZSBpcyBwbGF5ZXIgdnMgcGxheWVyIGFuZCBwbGF5ZXIgdnMgY29tcHV0ZXI/XG5leHBvcnQgZGVmYXVsdCAoW3BsYXllckJvYXJkLCBvcHBvbmVudEJvYXJkXSkgPT4ge1xuICAvLyBjb25zdCBib2FyZCA9IHBsYXllckJvYXJkO1xuICAvLyBEbyBJIG5lZWQgdG8gZGVjbGFyZSB0aGUgY29uc3QgdmFyaWFibGU/XG4gIGNvbnN0IHN0YXRlID0ge1xuICAgIGdldCBvcHBvbmVudEJvYXJkKCkge1xuICAgICAgcmV0dXJuIG9wcG9uZW50Qm9hcmQ7XG4gICAgfSxcbiAgICBnZXQgYm9hcmQoKSB7XG4gICAgICByZXR1cm4gcGxheWVyQm9hcmQ7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKlxuY29uc3QgcGlwZSA9IChpbml0aWFsRm4sIC4uLmZucykgPT4ge1xuICByZXR1cm4gZm5zLnJlZHVjZSgob2JqLCBmbikgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgZm4ob2JqKSk7XG4gIH0sIGluaXRpYWxGbigpKTtcbn07XG5cbmNvbnN0IEFuaW1hbCA9ICgpID0+IHtcbiAgbGV0IHdlaWdodDtcblxuICBjb25zdCBzdGF0ZSA9IHtcbiAgICB3ZWlnaHQsXG4gICAgaW5mbzogKCkgPT4gKHtcbiAgICAgIHdlaWdodDogc3RhdGUud2VpZ2h0LFxuICAgICAgbGVnczogc3RhdGUubGVncyxcbiAgICB9KSxcbiAgfTtcbiAgcmV0dXJuIHN0YXRlO1xufTtcblxuY29uc3QgQ2F0ID0gKHN0YXRlKSA9PiAoe1xuICB0eXBlOiAnY2F0JyxcbiAgbGVnczogNCxcbiAgc3BlYWs6ICgpID0+IGBtZW93LCBJIGhhdmUgJHtzdGF0ZS5sZWdzfSBsZWdzYCxcbiAgcG9vcDogKCkgPT4gYG1lb3cuLi5JIGFtIHBvb3BpbmcuYCxcbiAgcG9vcEFnYWluOiAoKSA9PiBgJHtzdGF0ZS5wb29wKCl9IG1lb3cgbWVvdy4uLkkgYW0gcG9vcGluZyBvbmNlIG1vcmVgLFxufSk7XG5cbmNvbnN0IEJpcmQgPSAoc3RhdGUpID0+ICh7XG4gIHR5cGU6ICdiaXJkJyxcbiAgbGVnczogMixcbiAgc3BlYWs6ICgpID0+IGBjaGlycC4uLmNoaXJwLCBJIGhhdmUgJHtzdGF0ZS5sZWdzfSBsZWdzYCxcbiAgcG9vcDogKCkgPT4gYGNoaXJwLi4uSSBhbSBwb29waW5nLmAsXG4gIHBvb3BBZ2FpbjogKCkgPT4gYCR7c3RhdGUucG9vcCgpfSBjaGlycCBjaGlycC4uLkkgYW0gcG9vcGluZyBvbmNlIG1vcmVgLFxufSk7XG5cbmNvbnN0IFdpemFyZCA9IChzdGF0ZSkgPT4gKHtcbiAgZmlyZWJhbGw6ICgpID0+IGAke3N0YXRlLnR5cGV9IGlzIGNhc3RpbmcgZmlyZWJhbGxgLFxufSk7XG5cbmNvbnN0IE5lY3JvbWFuY2VyID0gKHN0YXRlKSA9PiAoe1xuICBkZWZpbGVEZWFkOiAoKSA9PiBgJHtzdGF0ZS50eXBlfSBpcyBjYXN0aW5nIGRlZmlsZSBkZWFkYCxcbn0pO1xuXG5jb25zdCBjYXQgPSBwaXBlKEFuaW1hbCwgQ2F0LCBXaXphcmQpO1xuY29uc3QgYmlyZCA9IHBpcGUoQW5pbWFsLCBCaXJkLCBOZWNyb21hbmNlcik7XG5jb25zb2xlLmxvZyhjYXQuZmlyZWJhbGwoKSk7XG5jb25zb2xlLmxvZyhjYXQuc3BlYWsoKSk7XG5jb25zb2xlLmxvZyhjYXQuaW5mbygpKTtcbmNhdC53ZWlnaHQgPSAxMDtcbmNvbnNvbGUubG9nKGNhdC5pbmZvKCkpO1xuY29uc29sZS5sb2coYmlyZC5kZWZpbGVEZWFkKCkpO1xuY29uc29sZS5sb2coYmlyZC5zcGVhaygpKTtcbmNvbnNvbGUubG9nKGJpcmQuaW5mbygpKTtcbmJpcmQud2VpZ2h0ID0gMztcbmNvbnNvbGUubG9nKGJpcmQuaW5mbygpKTtcbiovXG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIHN1YnNjcmliZXJzOiB7fSxcbiAgc3Vic2NyaWJlKHN1YnNjcmliZXIsIGZuKSB7XG4gICAgLy8gV2hlbiB3b3VsZCB5b3Ugd2FudCB0byBzdWJzY3JpYmUgYSBzaW5nbGUgZnVuY3Rpb24gaW4gdGhlIHNhbWUgc3Vic2NyaWJlciBtb3JlIHRoYW4gb25jZT9cbiAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdID0gdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXSB8fCBbXTtcbiAgICBpZiAoIXRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uZmluZCgoaGFuZGxlcikgPT4gaGFuZGxlci5uYW1lID09PSBmbi5uYW1lKSkge1xuICAgICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5wdXNoKGZuKTtcbiAgICB9XG4gIH0sXG4gIHVuc3Vic2NyaWJlKHN1YnNjcmliZXIsIGZuKSB7XG4gICAgaWYgKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0pIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uc3BsaWNlKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uaW5kZXhPZihmbiksIDEpO1xuICAgICAgaWYgKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0ubGVuZ3RoID09PSAwKSBkZWxldGUgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXTtcbiAgICB9XG4gIH0sXG4gIHB1Ymxpc2goc3Vic2NyaWJlciwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmZvckVhY2goKGZuKSA9PiBmbiguLi5hcmdzKSk7XG4gICAgfVxuICB9LFxufTtcbiIsImV4cG9ydCBkZWZhdWx0IChzaGlwTGVuZ3RoLCBzaGlwSUQpID0+IHtcbiAgLy8gUHJvcGVydGllczpcbiAgLy8gIExlbmd0aFxuICAvLyAgTnVtYmVycyBvZiB0aW1lcyBoaXRcbiAgLy8gIFN1bmsgKHRydWUvZmFsc2UpXG4gIC8vIE1ldGhvZHM6XG4gIC8vICBIaXQsIGluY3JlYXNlcyB0aGUgbnVtYmVyIG9mIOKAmGhpdHPigJkgaW4geW91ciBzaGlwLlxuICAvLyAgaXNTdW5rKCkgY2FsY3VsYXRlcyB3aGV0aGVyIGEgc2hpcCBpcyBjb25zaWRlcmVkIHN1bmtcbiAgLy8gICAgQmFzZWQgb24gaXRzIGxlbmd0aCBhbmQgdGhlIG51bWJlciBvZiBoaXRzIGl0IGhhcyByZWNlaXZlZC5cbiAgLy8gLSBDYXJyaWVyXHQgICAgNVxuICAvLyAtIEJhdHRsZXNoaXBcdCAgNFxuICAvLyAtIERlc3Ryb3llclx0ICAzXG4gIC8vIC0gU3VibWFyaW5lXHQgIDNcbiAgLy8gLSBQYXRyb2wgQm9hdFx0MlxuICAvLyBjb25zdCBsZW5ndGggPSBzaXplO1xuICAvLyBIb3cgb3Igd2hlbiB0byBpbml0aWFsaXplIGEgc2hpcCdzIGxlbmd0aFxuICAvLyBXaGF0IGRldGVybWluZXMgYSBzaGlwcyBsZW5ndGg/XG4gIGNvbnN0IGxlbmd0aCA9IHNoaXBMZW5ndGg7XG4gIGNvbnN0IGlkID0gc2hpcElEO1xuICBsZXQgbnVtSGl0cyA9IDA7XG4gIGxldCBzdW5rID0gZmFsc2U7XG4gIGNvbnN0IGhpdCA9ICgpID0+IHtcbiAgICBpZiAoIXN1bmspIG51bUhpdHMgKz0gMTtcbiAgfTtcbiAgY29uc3QgaXNTdW5rID0gKCkgPT4ge1xuICAgIHN1bmsgPSBudW1IaXRzID09PSBsZW5ndGg7XG4gICAgcmV0dXJuIHN1bms7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBoaXQsXG4gICAgaXNTdW5rLFxuICAgIGdldCBsZW5ndGgoKSB7XG4gICAgICByZXR1cm4gbGVuZ3RoO1xuICAgIH0sXG4gICAgZ2V0IGlkKCkge1xuICAgICAgcmV0dXJuIGlkO1xuICAgIH0sXG4gIH07XG59O1xuIiwiaW1wb3J0IGdlbmVyYXRlVVVJRCBmcm9tICcuL2dlbmVyYXRlVVVJRCc7XG5cbmNvbnN0IEJ1aWxkRWxlbWVudCA9IChzdGF0ZSkgPT4gKHtcbiAgc2V0QXR0cmlidXRlczogKGF0dHJpYnV0ZXMpID0+IHtcbiAgICBPYmplY3QuZW50cmllcyhhdHRyaWJ1dGVzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmIChrZXkgIT09ICd0ZXh0Q29udGVudCcpIHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzJykge1xuICAgICAgICAgIHN0YXRlLnNldENsYXNzTmFtZSh2YWx1ZS5zcGxpdCgvXFxzLykpO1xuICAgICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgIHN0YXRlLnNldFN0eWxlKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChrZXkgPT09ICdkYXRhLWlkJykge1xuICAgICAgICAgIHN0YXRlLnNldEF0dHJpYnV0ZShrZXksIGdlbmVyYXRlVVVJRCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZS5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnNldFRleHRDb250ZW50KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgc2V0U3R5bGU6ICh0ZXh0KSA9PiB7XG4gICAgc3RhdGUuc3R5bGUuY3NzVGV4dCA9IHRleHQ7XG4gIH0sXG4gIHNldElEOiAoaWQpID0+IHtcbiAgICBzdGF0ZS5pZCA9IGlkO1xuICB9LFxuICBzZXRDbGFzc05hbWU6IChhcnJDbGFzcykgPT4ge1xuICAgIGFyckNsYXNzLmZvckVhY2goKGNsYXNzTmFtZSkgPT4gc3RhdGUuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpKTtcbiAgfSxcbiAgc2V0VGV4dENvbnRlbnQ6ICh0ZXh0KSA9PiB7XG4gICAgc3RhdGUudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB9LFxuICBzZXRDaGlsZHJlbjogKGNoaWxkcmVuKSA9PiB7XG4gICAgY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoY2hpbGQuZWxlbWVudCk7XG4gICAgICBpZiAoY2hpbGQuYXR0cmlidXRlcyAmJiBjaGlsZC5hdHRyaWJ1dGVzLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdPYmplY3QnKSB7XG4gICAgICAgIGNoaWxkRWxlbWVudC5zZXRBdHRyaWJ1dGVzKGNoaWxkLmF0dHJpYnV0ZXMpO1xuICAgICAgfVxuICAgICAgaWYgKGNoaWxkLmNoaWxkcmVuKSB7XG4gICAgICAgIC8vIFdoYXQgaWYgY2hpbGQgb2YgY2hpbGQuY2hpbGRyZW4gaGFzIGNoaWxkcmVuP1xuICAgICAgICBjaGlsZEVsZW1lbnQuc2V0Q2hpbGRyZW4oY2hpbGQuY2hpbGRyZW4pO1xuICAgICAgfVxuICAgICAgc3RhdGUuYXBwZW5kQ2hpbGQoY2hpbGRFbGVtZW50KTtcbiAgICB9KTtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZykge1xuICBjb25zdCBodG1sRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcblxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihodG1sRWxlbWVudCwgQnVpbGRFbGVtZW50KGh0bWxFbGVtZW50KSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IDYgY2hhcmFjdGVycyBmcm9tIGNyeXB0by5yYW5kb21VVUlEKClcbiAgLy8gUHNldWRvLXJhbmRvbWx5IGNoYW5nZXMgYSBsb3dlcmNhc2UgbGV0dGVyIHRvIHVwcGVyY2FzZVxuICBjb25zdCB1dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgcmV0dXJuIFsuLi51dWlkLnN1YnN0cmluZygwLCB1dWlkLmluZGV4T2YoJy0nKSldLnJlZHVjZSgod29yZCwgY3VycmVudENoYXIpID0+IHtcbiAgICBjb25zdCBjaGVjayA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpO1xuICAgIGlmIChjaGVjayA9PSBmYWxzZSAmJiBjdXJyZW50Q2hhci5tYXRjaCgvW2Etel0vKSkge1xuICAgICAgcmV0dXJuIHdvcmQgKyBjdXJyZW50Q2hhci50b1VwcGVyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gd29yZCArIGN1cnJlbnRDaGFyO1xuICB9KTtcbn07XG5cbi8qXG5PcHRpb25hbCB3YXkgbm90IHVzaW5nIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKVxuY29uc3QgZ2VuZXJhdGVVVUlEID0gKCkgPT4ge1xuICBjb25zdCB1dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICByZXR1cm4gWy4uLnV1aWQuc3Vic3RyaW5nKDAsIHV1aWQuaW5kZXhPZignLScpKV0ubWFwKChjaGFyKSA9PiB7XG4gICAgICBjb25zdCBjaGVjayA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpO1xuICAgICAgaWYgKGNoZWNrID09IGZhbHNlICYmIGNoYXIubWF0Y2goL1thLXpdLykpIHtcbiAgICAgICAgcmV0dXJuIGNoYXIudG9VcHBlckNhc2UoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGFyO1xuICAgIH0pLmpvaW4oJycpO1xufTtcbiovXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=