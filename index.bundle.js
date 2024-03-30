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
`, "",{"version":3,"sources":["webpack://./src/app.css"],"names":[],"mappings":"AAAA;EACE,uDAAuD;EACvD,+BAA+B;EAC/B,4CAA2E;EAC3E,gBAAgB;EAChB,kBAAkB;AACpB;;AAEA;;;EAGE,UAAU;EACV,SAAS;EACT,sBAAsB;EACtB,eAAe;AACjB;;AAEA;EACE,kBAAkB;EAClB,mCAAmC;EACnC,sCAAsC;EACtC,+BAA+B;EAC/B,kBAAkB;AACpB;;AAEA;EACE,mBAAmB;EACnB,aAAa;EACb,mCAAmC;AACrC;;AAEA;EACE,cAAc;EACd,qBAAqB;AACvB;;AAEA;EACE,YAAY;EACZ,aAAa;EACb,uBAAuB;AACzB","sourcesContent":["@font-face {\n  /* https://fonts.google.com/specimen/Roboto+Condensed */\n  font-family: 'Roboto Condensed';\n  src: url(./assets/fonts/Roboto_Condensed/static/RobotoCondensed-Medium.ttf);\n  font-weight: 600;\n  font-style: normal;\n}\n\n*,\n*::before,\n*::after {\n  padding: 0;\n  margin: 0;\n  box-sizing: border-box;\n  font-size: 16px;\n}\n\nbody {\n  min-height: 100svh;\n  background-color: rgb(149, 116, 59);\n  font-family: 'Roboto Condensed', Arial;\n  font-family: 'Roboto Condensed';\n  font-family: Arial;\n}\n\n#battleship_app {\n  min-height: inherit;\n  display: grid;\n  grid-template-rows: min-content 1fr;\n}\n\n#main_content {\n  /* Temporary */\n  /* margin-top: 4em; */\n}\n\n#main_content > :first-child {\n  height: 100%;\n  display: flex;\n  justify-content: center;\n}\n"],"sourceRoot":""}]);
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
  padding: 1em 2em 4em;
  background-color: rgb(165, 165, 165);
}
`, "",{"version":3,"sources":["webpack://./src/styles/header.css"],"names":[],"mappings":"AAAA;EACE,oBAAoB;EACpB,oCAAoC;AACtC","sourcesContent":["#header {\n  padding: 1em 2em 4em;\n  background-color: rgb(165, 165, 165);\n}\n"],"sourceRoot":""}]);
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
  padding: 2em;
}

.gamemode_btns > * > span {
  font-size: 2em;
}
`, "",{"version":3,"sources":["webpack://./src/styles/home.css"],"names":[],"mappings":"AAAA;AACA;;AAEA;EACE,aAAa;EACb,sBAAsB;EACtB,uBAAuB;EACvB,QAAQ;AACV;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,cAAc;AAChB","sourcesContent":["#home {\n}\n\n.gamemode_btns {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  gap: 2em;\n}\n\n.gamemode_btns > * {\n  padding: 2em;\n}\n\n.gamemode_btns > * > span {\n  font-size: 2em;\n}\n"],"sourceRoot":""}]);
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
}

#navbar > * {
  display: flex;
  list-style: none;
}

.nav_right {
  position: relative;
}

.nav_right > :last-child {
  /* Experimenting */
  position: absolute;
  right: 0;
  top: 1em;
  padding: 1rem;
}

.nav_item.nav_logo {
  display: flex;
}
`, "",{"version":3,"sources":["webpack://./src/styles/navbar.css"],"names":[],"mappings":"AAAA;EACE,aAAa;EACb,8BAA8B;AAChC;;AAEA;EACE,aAAa;EACb,gBAAgB;AAClB;;AAEA;EACE,kBAAkB;AACpB;;AAEA;EACE,kBAAkB;EAClB,kBAAkB;EAClB,QAAQ;EACR,QAAQ;EACR,aAAa;AACf;;AAEA;EACE,aAAa;AACf","sourcesContent":["#navbar {\n  display: flex;\n  justify-content: space-between;\n}\n\n#navbar > * {\n  display: flex;\n  list-style: none;\n}\n\n.nav_right {\n  position: relative;\n}\n\n.nav_right > :last-child {\n  /* Experimenting */\n  position: absolute;\n  right: 0;\n  top: 1em;\n  padding: 1rem;\n}\n\n.nav_item.nav_logo {\n  display: flex;\n}\n"],"sourceRoot":""}]);
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
___CSS_LOADER_EXPORT___.push([module.id, `.notifications_container {
  display: flex;
  justify-content: center;
}
`, "",{"version":3,"sources":["webpack://./src/styles/notifications.css"],"names":[],"mappings":"AAAA;EACE,aAAa;EACb,uBAAuB;AACzB","sourcesContent":[".notifications_container {\n  display: flex;\n  justify-content: center;\n}\n"],"sourceRoot":""}]);
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
___CSS_LOADER_EXPORT___.push([module.id, `.port_lines {
  display: flex;
}

.port_ship {
  position: relative;
  border: 1px dotted #b2b2b9;
  margin: 0.5em;
  /* box-sizing: content-box; */
}

.ship_box {
  z-index: 2;
  position: absolute;
  background: rgba(0, 0, 255, 0.05);
  border: 2px solid #00f;
  left: 0;
  top: 0;
  /* box-sizing: content-box; */
}

.ship_box:hover {
  cursor: move;
}

.cell_content > .ship_box {
  /* Comment out if using box-sizing: content */
  left: -4%;
  top: -4%;
}

.ship_box.dragging.ship_box_transparent {
  background: transparent;
  border: transparent;
}
`, "",{"version":3,"sources":["webpack://./src/styles/port.css"],"names":[],"mappings":"AAAA;EACE,aAAa;AACf;;AAEA;EACE,kBAAkB;EAClB,0BAA0B;EAC1B,aAAa;EACb,6BAA6B;AAC/B;;AAEA;EACE,UAAU;EACV,kBAAkB;EAClB,iCAAiC;EACjC,sBAAsB;EACtB,OAAO;EACP,MAAM;EACN,6BAA6B;AAC/B;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,6CAA6C;EAC7C,SAAS;EACT,QAAQ;AACV;;AAEA;EACE,uBAAuB;EACvB,mBAAmB;AACrB","sourcesContent":[".port_lines {\n  display: flex;\n}\n\n.port_ship {\n  position: relative;\n  border: 1px dotted #b2b2b9;\n  margin: 0.5em;\n  /* box-sizing: content-box; */\n}\n\n.ship_box {\n  z-index: 2;\n  position: absolute;\n  background: rgba(0, 0, 255, 0.05);\n  border: 2px solid #00f;\n  left: 0;\n  top: 0;\n  /* box-sizing: content-box; */\n}\n\n.ship_box:hover {\n  cursor: move;\n}\n\n.cell_content > .ship_box {\n  /* Comment out if using box-sizing: content */\n  left: -4%;\n  top: -4%;\n}\n\n.ship_box.dragging.ship_box_transparent {\n  background: transparent;\n  border: transparent;\n}\n"],"sourceRoot":""}]);
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
___CSS_LOADER_EXPORT___.push([module.id, `#board_container {
  margin-top: 4em;
  display: flex;
  gap: 8rem;
  user-select: none;
}

#board_container > * > .board > * {
  display: flex;
}

#board_container > *.wait > *:not(.game_start) {
  opacity: 0.4;
}

#board_container > * > .board > * > button {
  cursor: pointer;
  border: none;
}

#board_container > *:not(.wait) > * > * > .cell > .cell_content > .ship {
  background-color: transparent;
}

.player_one,
.player_two {
  position: relative;
  width: min-content;
}

.player_two > .game_start {
  display: none;
}

.player_two.wait > .game_start {
  display: block;
  position: absolute;
  top: 20%;
}

.game_start > button {
  font-size: 4rem;
}

.cell > * {
  width: 2em;
  height: 2em;
  position: relative;
  background-color: white;
  /* pointer-events: none; */
  border: 1px solid black;
  /* box-sizing: content-box; */
}

.cell > .cell_content > .ship {
  /*
  Show ship during placing ships phase
  Show only active player's ship when game is in play
  */
  pointer-events: none;
  height: inherit;
  background-color: cornflowerblue;
}

/* #board_container > *:not(.wait) > .board > .board_row > .cell.hit > .cell_content > .ship, */
#board_container > * > .board > * > .cell.hit > .cell_content > .ship {
  background-color: red;
}

#board_container > * > .board > * > .cell.miss > .cell_content {
  background-color: grey;
}

.cell_content > .row_marker {
  position: absolute;
  height: 100%;
  display: flex;
  left: -2em;
  top: 0;
  align-items: center;
  z-index: -1;
}

.cell_content > .col_marker {
  position: absolute;
  top: -2em;
  text-align: center;
  width: 100%;
  z-index: -1;
}
`, "",{"version":3,"sources":["webpack://./src/styles/screenController.css"],"names":[],"mappings":"AAAA;EACE,eAAe;EACf,aAAa;EACb,SAAS;EACT,iBAAiB;AACnB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,eAAe;EACf,YAAY;AACd;;AAEA;EACE,6BAA6B;AAC/B;;AAEA;;EAEE,kBAAkB;EAClB,kBAAkB;AACpB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,cAAc;EACd,kBAAkB;EAClB,QAAQ;AACV;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,UAAU;EACV,WAAW;EACX,kBAAkB;EAClB,uBAAuB;EACvB,0BAA0B;EAC1B,uBAAuB;EACvB,6BAA6B;AAC/B;;AAEA;EACE;;;GAGC;EACD,oBAAoB;EACpB,eAAe;EACf,gCAAgC;AAClC;;AAEA,+FAA+F;AAC/F;EACE,qBAAqB;AACvB;;AAEA;EACE,sBAAsB;AACxB;;AAEA;EACE,kBAAkB;EAClB,YAAY;EACZ,aAAa;EACb,UAAU;EACV,MAAM;EACN,mBAAmB;EACnB,WAAW;AACb;;AAEA;EACE,kBAAkB;EAClB,SAAS;EACT,kBAAkB;EAClB,WAAW;EACX,WAAW;AACb","sourcesContent":["#board_container {\n  margin-top: 4em;\n  display: flex;\n  gap: 8rem;\n  user-select: none;\n}\n\n#board_container > * > .board > * {\n  display: flex;\n}\n\n#board_container > *.wait > *:not(.game_start) {\n  opacity: 0.4;\n}\n\n#board_container > * > .board > * > button {\n  cursor: pointer;\n  border: none;\n}\n\n#board_container > *:not(.wait) > * > * > .cell > .cell_content > .ship {\n  background-color: transparent;\n}\n\n.player_one,\n.player_two {\n  position: relative;\n  width: min-content;\n}\n\n.player_two > .game_start {\n  display: none;\n}\n\n.player_two.wait > .game_start {\n  display: block;\n  position: absolute;\n  top: 20%;\n}\n\n.game_start > button {\n  font-size: 4rem;\n}\n\n.cell > * {\n  width: 2em;\n  height: 2em;\n  position: relative;\n  background-color: white;\n  /* pointer-events: none; */\n  border: 1px solid black;\n  /* box-sizing: content-box; */\n}\n\n.cell > .cell_content > .ship {\n  /*\n  Show ship during placing ships phase\n  Show only active player's ship when game is in play\n  */\n  pointer-events: none;\n  height: inherit;\n  background-color: cornflowerblue;\n}\n\n/* #board_container > *:not(.wait) > .board > .board_row > .cell.hit > .cell_content > .ship, */\n#board_container > * > .board > * > .cell.hit > .cell_content > .ship {\n  background-color: red;\n}\n\n#board_container > * > .board > * > .cell.miss > .cell_content {\n  background-color: grey;\n}\n\n.cell_content > .row_marker {\n  position: absolute;\n  height: 100%;\n  display: flex;\n  left: -2em;\n  top: 0;\n  align-items: center;\n  z-index: -1;\n}\n\n.cell_content > .col_marker {\n  position: absolute;\n  top: -2em;\n  text-align: center;\n  width: 100%;\n  z-index: -1;\n}\n"],"sourceRoot":""}]);
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
              class: 'nav_item',
            },
            children: [
              {
                element: 'img',
                attributes: {
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
              class: 'nav_item leave_game',
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
/* harmony import */ var _styles_navbar_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../styles/navbar.css */ "./src/styles/navbar.css");




/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const navbar = {
    init() {},
    cacheDOM(element) {
      this.navbar = element;
    },
    bindEvents() {},
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
      return navElement;
    },
  };

  return navbar.render();
});


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
/* harmony import */ var _styles_notifications_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../styles/notifications.css */ "./src/styles/notifications.css");




/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const notifications = {
    init() {
      this.updateNotification = this.updateNotification.bind(this);
    },
    cacheDOM(element) {
      this.notificationMessage = element.querySelector('#notification_message');
    },
    bindEvents() {
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].subscribe('notify', this.updateNotification);
    },
    render() {
      const notificationsContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
      const notificationMessage = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');

      notificationsContainer.classList.add('notifications_container');
      notificationMessage.setAttributes({
        id: 'notification_message',
        textContent: 'Pick game mode',
      });

      notificationsContainer.appendChild(notificationMessage);
      this.cacheDOM(notificationsContainer);
      this.bindEvents();

      return notificationsContainer;
    },
    updateNotification(something) {
      this.notificationMessage.textContent = something;
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
  // {
  //   element: 'h2',
  //   attributes: {
  //     textContent: 'Battleship',
  //   },
  // },
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
      console.log(this.home);
      console.log(this.modeBtns);
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
      console.log(gamemode);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('main_render', gamemode);
    },
  };

  return home.render();
});


/***/ }),

/***/ "./src/components/main/main.config.js":
/*!********************************************!*\
  !*** ./src/components/main/main.config.js ***!
  \********************************************/
/***/ (() => {



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
/* harmony import */ var _main_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./main.config */ "./src/components/main/main.config.js");
/* harmony import */ var _main_config__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_main_config__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _home_home__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../home/home */ "./src/components/home/home.js");
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");







/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  const build = {
    home: _home_home__WEBPACK_IMPORTED_MODULE_3__["default"],
    game: _screen_screenController__WEBPACK_IMPORTED_MODULE_1__["default"],
  };
  const main = {
    init() {},
    cacheDOM(element) {
      this.main = element;
      console.log(this.main);
    },
    bindEvents() {
      this.render = this.render.bind(this);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_4__["default"].subscribe('main_render', this.render);
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
      }
    },
  };

  return main.render();
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
/* harmony import */ var _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../containers/pubSub */ "./src/containers/pubSub.js");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((state) => ({
  offSetX: 0,
  offSetY: 0,
  init() {
    console.log('init running from composeGame');
  },
  renderShip(element) {
    // This will append to the content div
    console.log(element);
  },
  dragStartHandler(e) {
    console.log('drag start');
    this.draggable = e.currentTarget;
    this.dragStart = e.target.parentElement;
    this.dropPlaceholder = this.draggable.cloneNode();
    this.dropPlaceholder.classList.add('ship_box_placeholder');
    this.offSetX = e.clientX;
    this.offSetY = e.clientY;
    document.addEventListener('mousemove', this.dragMoveHandler);
    document.addEventListener('mouseup', this.dragEndHandler);
  },
  dragMoveHandler(e) {
    // console.clear();
    // console.log('drag move');

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
    if (cell) {
      // Dragging over drop zone
      // If draggable is more than 50% over it's 'last' cell
      //  Append the draggable to the cell content container
      // console.log('dragging over drop zone');
      this.cell = cell;
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);

      const id = this.draggable.dataset.id;
      this.game.playerOneBoard.placeShip([x, y], shipLength, false, id, true);

      // this.dropHandler(true);
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
    // console.log('drag end');
    this.draggable.style.left = `0px`;
    this.draggable.style.top = `0px`;

    this.draggable.classList.remove('dragging');
    this.draggable.classList.remove('ship_box_transparent');
    this.dragStart.classList.remove('dragstart');

    document.removeEventListener('mousemove', this.dragMoveHandler);
    document.removeEventListener('mouseup', this.dragEndHandler);
    // this.dropHandler(false);
    // console.log(this.game.playerOneBoard.board);
    if (this.cell) {
      // If user has stopped dragging over the drop zone
      // console.log(`dragEndHandler running with this.cell defined`);
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);
      const shipLength = parseInt(this.draggable.dataset.length);
      const id = this.draggable.dataset.id;
      this.game.playerOneBoard.placeShip([x, y], shipLength, false, id, false);
    }

    if (!this.dragStart.classList.contains('port_ship') && this.draggable) {
      // If dragStart is not the port_ship element
      // const btn = this.dragStart.parentElement;
      // const x = parseInt(btn.dataset.x);
      // const y = parseInt(btn.dataset.y);
      // const shipLength = parseInt(this.draggable.dataset.length);
      // const id = this.draggable.dataset.id;
      // this.game.playerOneBoard.placeShip([x, y], shipLength, false, id, false);
      this.draggable.style.left = `-4%`;
      this.draggable.style.top = `-4%`;
      console.log(this.boards.playerOne);
    }
  },
  dropHandler(isDragging, isValidDrop) {
    // console.log('drag drop');
    if (this.cell) {
      const cellContent = this.cell.firstChild;
      if (isDragging && isValidDrop) {
        // If user is dragging over the drop zone
        // How to handle if there is a ship at or near a coordinate?
        // console.log(`dragging over drop zone`);
        cellContent.appendChild(this.dropPlaceholder);
        this.draggable.classList.add('ship_box_transparent');
      } else if (!isDragging && isValidDrop) {
        // If user has stopped dragging over the drop zone
        // console.log(`dragging stopped over the drop zone`);
        cellContent.appendChild(this.draggable);
        this.dropPlaceholder.remove();
        this.draggable.style.left = `-4%`;
        this.draggable.style.top = `-4%`;
        // this.draggable = null;
        this.draggable.addEventListener('click', this.rotateHandler);
      } else if (isDragging && !isValidDrop) {
        // console.log(`there is a ship on or near coordinates`);
        if (this.dropPlaceholder) {
          this.dropPlaceholder.remove();
          this.draggable.classList.remove('ship_box_transparent');
        }
      }
    } else if (!this.cell && isDragging === false) {
      // If user has stopped dragging outside the drop zone
      // Draggable needs to append back to this.dragStart
      console.log(`dragging stopped outside the drop zone`);
    }
  },
  rotateHandler(e) {
    console.log(`rotateHandler being called`);
    if (!this.draggable.classList.contains('dragging')) {
      console.log(`rotateHandler being called`);
    }
  },
  reset(e) {
    // Clears board
  },
  start(e) {
    // Set this.gameReady to true
    // Publish something...?
    // Reveal player two's board
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
/* harmony import */ var _composeGame__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./composeGame */ "./src/components/screen/composeGame.js");



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((state) => ({
  init() {
    console.log(`init running from playGame`);
  },
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
  renderAttack(cell, coordinate) {
    const button = this.getButton(coordinate);
    button.classList.add(cell.miss ? 'miss' : 'hit');
  },
  renderWait() {
    let notificationMessage = `Player one's turn.`;
    if (this.game.activePlayer === this.game.playerOne) {
      // If game.activePlayer is NOT playerOne
      // Put 'wait' class on the player one's container
      console.log(`Player two attacks player one`);
      this.playerOneHeader.textContent = `Your grid`;
      this.playerTwoHeader.textContent = `Opponent's grid`;
      this.playerOneContainer.classList.add('wait');
      this.playerTwoContainer.classList.remove('wait');
      this.playerOneBoard.removeEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    } else {
      console.log(`Player one attacks player two`);
      this.playerOneHeader.textContent = `Opponent's grid`;
      this.playerTwoHeader.textContent = `Your grid`;
      this.playerTwoContainer.classList.add('wait');
      this.playerOneContainer.classList.remove('wait');
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.removeEventListener('click', this.boardHandler);
      notificationMessage = `Player two's turn.`;
    }

    _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__["default"].publish('notify', notificationMessage);

    if (!this.mode && this.game.activePlayer === this.game.playerTwo) {
      // Optional, put a setTimeout()
      this.game.playRound();
    }
  },
  endGame(message) {
    this.unbindEvents();
    _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__["default"].publish('notify', message);
    console.log(`game is over`);
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

/***/ "./src/components/screen/port.config.js":
/*!**********************************************!*\
  !*** ./src/components/screen/port.config.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ([
  {
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
              style: 'width: 8em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '4',
                  ['data-orientation']: 'h',
                  style: 'width: 8em; height: 2em;',
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
              style: 'width: 6em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '3',
                  ['data-orientation']: 'h',
                  style: 'width: 6em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 6em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '3',
                  ['data-orientation']: 'h',
                  style: 'width: 6em; height: 2em;',
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
              style: 'width: 4em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '2',
                  ['data-orientation']: 'h',
                  style: 'width: 4em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 4em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '2',
                  ['data-orientation']: 'h',
                  style: 'width: 4em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 4em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '2',
                  ['data-orientation']: 'h',
                  style: 'width: 4em; height: 2em;',
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
                  // draggable: 'true',
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
    ],
  },
]);


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
/* harmony import */ var _port_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./port.config */ "./src/components/screen/port.config.js");
/* harmony import */ var _styles_screenController_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../styles/screenController.css */ "./src/styles/screenController.css");
/* harmony import */ var _styles_port_css__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../styles/port.css */ "./src/styles/port.css");









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
        playerOne: this.game.playerOneBoard.board,
        playerTwo: this.game.playerTwoBoard.board,
      };
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('notify', 'Place ships');
      this.updateGameState(_composeGame__WEBPACK_IMPORTED_MODULE_3__["default"]);
      this.start = this.start.bind(this);
      this.renderShip = this.renderShip.bind(this);
    },
    updateGameState(callback) {
      Object.assign(this, callback());
    },
    cacheDOM(element) {
      this.gameContainer = element;
      this.boardContainer = element.querySelector('#board_container');
      this.playerOneContainer = element.querySelector('.player_one');
      this.playerTwoContainer = element.querySelector('.player_two');
      this.playerOneBoard = element.querySelector('.player_one > .board');
      this.playerTwoBoard = element.querySelector('.player_two > .board');
      this.playerOneHeader = element.querySelector('.player_one > h4');
      this.playerTwoHeader = element.querySelector('.player_two > h4');
      this.startBtn = element.querySelector('.game_start_btn');
      this.playerOneCells = element.querySelectorAll('.player_one > .board > .cell');
      this.playerTwoCells = element.querySelectorAll('.player_two > .board > .cell');

      this.ships = element.querySelectorAll('.ship_box');
    },
    bindEvents() {
      if (!this.gameReady) {
        this.dragStartHandler = this.dragStartHandler.bind(this);
        this.dragEndHandler = this.dragEndHandler.bind(this);
        this.dragMoveHandler = this.dragMoveHandler.bind(this);
        this.dropHandler = this.dropHandler.bind(this);
        this.rotateHandler = this.rotateHandler.bind(this);
        this.startBtn.addEventListener('click', this.start);

        this.ships.forEach((ship) => {
          ship.addEventListener('mousedown', this.dragStartHandler);
        });
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('drop', this.dropHandler);
      }
      if (this.gameReady) {
        this.updateGameState(_playGame__WEBPACK_IMPORTED_MODULE_4__["default"]);
        this.renderAttack = this.renderAttack.bind(this);
        this.endGame = this.endGame.bind(this);
        this.renderWait = this.renderWait.bind(this);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('renderAttack', this.renderAttack);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('endGame', this.endGame);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('renderWait', this.renderWait);
        this.boardHandler = this.boardHandler.bind(this);
      }
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    },
    render() {
      const gameContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('section');
      const boardContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerOneContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerTwoContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerOneHeader = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('h4');
      const playerTwoHeader = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('h4');
      const gameStartContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const gameStartBtn = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('button');
      const gameStartBtnText = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('span');
      gameStartBtnText.textContent = 'Play';
      gameContainer.id = 'game_container';
      boardContainer.id = 'board_container';
      playerOneContainer.classList.add('player_one');
      playerTwoContainer.classList.add('player_two');
      playerOneHeader.textContent = 'Your grid';
      playerTwoHeader.textContent = `Opponent's grid`;
      gameStartContainer.classList.add('game_start');
      gameStartBtn.classList.add('game_start_btn');
      // Renders players' boards
      playerOneContainer.appendChild(this.renderBoard(this.boards.playerOne));
      playerTwoContainer.appendChild(this.renderBoard(this.boards.playerTwo));
      playerOneContainer.appendChild(playerOneHeader);
      playerTwoContainer.appendChild(playerTwoHeader);
      boardContainer.appendChild(playerOneContainer);
      boardContainer.appendChild(playerTwoContainer);
      gameStartBtn.appendChild(gameStartBtnText);
      gameStartContainer.appendChild(gameStartBtn);
      if (!this.gameReady) {
        playerTwoContainer.classList.add('wait');
        playerTwoContainer.appendChild(gameStartContainer);

        _port_config__WEBPACK_IMPORTED_MODULE_5__["default"].forEach((port) => {
          const playerOnePort = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])(port.element);
          playerOnePort.setAttributes(port.attributes);
          playerOnePort.setChildren(port.children);
          playerOneContainer.appendChild(playerOnePort);
        });

        _port_config__WEBPACK_IMPORTED_MODULE_5__["default"].forEach((port) => {
          const playerTwoPort = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])(port.element);
          playerTwoPort.setAttributes(port.attributes);
          playerTwoPort.setChildren(port.children);
          playerTwoContainer.appendChild(playerTwoPort);
        });
      }
      gameContainer.appendChild(boardContainer);
      if (this.gameReady) this.gameContainer.replaceWith(gameContainer);
      this.cacheDOM(gameContainer);
      this.bindEvents();
      if (!this.gameReady) return gameContainer;
      // Does having this if statement matter?
    },
    renderBoard(board) {
      const playerBoard = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      playerBoard.classList.add('board');
      board.forEach((row, y) => {
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
          if (cell.ship) {
            // Problem, allows opponents to cheat in a browser developer tools
            const cellShip = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
            cellShip.classList.add('ship');
            cellContent.appendChild(cellShip);
          }
          cellContent.classList.add('cell_content');
          cellBtn.appendChild(cellContent);
          // Need to check for left and top edges of board
          // To create row and column labels
          if (x === 0 || y === 0) {
            const rowMarker = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
            const colMarker = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
            if (x === 0) {
              rowMarker.setAttributes({ class: 'row_marker', textContent: `${y + 1}` });
              cellContent.appendChild(rowMarker);
            }

            if (y === 0) {
              colMarker.setAttributes({
                class: 'col_marker',
                textContent: `${String.fromCharCode(65 + x)}`,
              });
              cellContent.appendChild(colMarker);
            }
          }
          boardRow.appendChild(cellBtn);
          // playerBoard.appendChild(cellBtn);
        });
        playerBoard.appendChild(boardRow);
      });
      return playerBoard;
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
      _pubSub__WEBPACK_IMPORTED_MODULE_5__["default"].publish('endGame', status.message);
    }
  };

  const getGameStatus = () => {
    const status = { status: playerOneBoard.getStatus() || playerTwoBoard.getStatus() };
    if (status.status) {
      // Game is over
      const message = playerOneBoard.getStatus() ? 'Player two won!' : 'Player one won!';
      Object.assign(status, { message });
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



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  // Keep track of missed attacks so they can display them properly.
  // Be able to report whether or not all of their ships have been sunk.
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
  // 10 x 10 grid
  // const board = new Array(10).fill().map(() => new Array(10).fill(undefined));
  /*
  [
        1     2     3     4     5     6     7     8     9     10
  10  [null, null, null, null, null, null, null, null, null, null], 0
  09  [null, null, null, null, null, null, null, null, null, null], 1
  08  [null, null, null, null, null, null, null, null, null, null], 2
  07  [null, null, null, null, null, null, null, null, null, null], 3
  06  [null, null, null, null, null, null, null, null, null, null], 4
  05  [null, null, null, null, null, null, null, null, null, null], 5
  04  [null, null, null, null, null, null, null, null, null, null], 6
  03  [null, null, null, null, null, null, null, null, null, null], 7
  02  [null, null, null, null, null, null, null, null, null, null], 8
  01  [null, null, null, null, null, null, null, null, null, null], 9
        0     1      2    3     4     5     6     7     8     9
  ]
  */

  const parseCoordinate = ([x, y]) => {
    // Parses coordinate inputted by user such that
    // the value pairs can be used for accessing elements
    // in the two dimensional array
    return [board.length - y, x - 1];
  };

  const generateShipCoordinates = ([x, y], orientation, shipLength) => {
    const coordinates = [[x, y]];

    if (orientation) {
      // Vertical
      // [5, 3] in 2d array terms => [7][4], [8][4], [9][4]
      for (let i = x; i < x + shipLength; i += 1) {
        coordinates.push([i, y]);
      }
    } else {
      // Horizontal
      // [5, 3] in 2d array terms => [7][4], [7][5], [7][6]
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

  const memo = [];
  const placeShip = (coordinates, shipLength, orientation, id, isDragging) => {
    // Be able to place ships at specific coordinates by calling the ship factory function.
    // Ship must fit on board based on coordinates
    //  What if ship can be rotated?
    // If ship is horizontal
    //  Involves columns
    // If ship is vertical
    //  Involves rows
    // For example, if ship is a length of 5 AND horizontal
    //  [x, y] => [5, 3] => placeShip([5, 3])
    //  Ship should be on board from [5, 3] to [9, 3]
    //  Based on array => board[7][4] to board[7][8]
    // What if coordinates are based on draggable ships?
    //  How to determine if the ship will fit on the board?
    //  How to handle if the ship does not fit on the board?
    // What if there is a ship already at given coordinates?
    // A ship MUST be 1 coordinate away from another ship

    // If id exists on board
    //  Find the cells with ship.id === id
    //  Replace cells with Cell()
    // memo = memo.filter((cell) => {
    //   if (cell.id === id) {
    //     const { row, col } = cell;
    //     board[row][col] = Cell();
    //     return false;
    //   } else {
    //     return true;
    //   }
    // });

    // const isShipOnBoard = memo.some((cell) => cell.id === id);
    // if (isShipOnBoard) {
    //   for (let i = 0; i < memo.length; i += 1) {
    //     if (memo[i].id === id) {
    //       console.log(`memo[i].id: ${memo[i].id}`);
    //       console.log(`id: ${id}`);
    //       const { row, col } = memo[i];
    //       board[row][col] = Cell();
    //       memo.splice(i, 1);
    //     }
    //   }
    // }

    const [x, y] = parseCoordinate(coordinates);
    const shipCoordinates = generateShipCoordinates([x, y], orientation, shipLength);
    const isValidCoordinates = shipCoordinates.every((coordinate) => {
      return checkBoard(coordinate, id);
    });

    if (isValidCoordinates && !isDragging) {
      const newShip = (0,_containers_ship__WEBPACK_IMPORTED_MODULE_0__["default"])(shipLength, id);
      // Check if x and y are within the board's size
      // Check if there is a ship at x and y

      const isShipOnBoard = memo.some((cell) => cell.id === id);
      if (isShipOnBoard) {
        for (let i = 0; i < memo.length; i += 1) {
          if (memo[i].id === id) {
            const { row, col } = memo[i];
            board[row][col] = Cell();
            memo.splice(i, 1);
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
        // board[x].fill(newShip, y, y + newShip.length);
        for (let i = y; i < y + newShip.length; i += 1) {
          board[x][i] = Cell(newShip);
          memo.push({ row: x, col: i, id });
        }
      }

      // Pubsub publish something...(?)
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('drop', false, true);
    } else if (isValidCoordinates && isDragging) {
      console.log('dragging');
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('drop', true, true);
    } else if (!isValidCoordinates && isDragging) {
      console.log(`there is a ship on or near coordinates`);
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('drop', true, false);
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
    // Can I store the missed shots directly on the board?
    // How to handle if a coordinate has already been attacked?
    //  Throw an error?

    const cell = getBoardCell([x, y]);
    const isValidAttack = validateAttack(x, y);

    if (isValidAttack) {
      cell.attack();
      shots.push([x, y]);
      // Publish to the screenController.renderAttack method?
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('renderAttack', cell, [x, y]);
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
    getStatus,
    getBoardCell,
    get board() {
      return board;
    },
  };
});

const numbers = [
  [
    {
      num: {
        value: 1,
      },
    },
    {
      num: {
        value: 2,
      },
    },
    {
      num: {
        value: 3,
      },
    },
    {
      num: {
        value: 1,
      },
    },
  ],
  [
    {
      num: {
        value: 8,
      },
    },
    {
      num: {
        value: 1,
      },
    },
  ],
];

const nar = { num: { value: 1987398789273 } };
const memo = [];
// numbers[0][4] = nar;
// const ref = numbers[0][4];
// memo.push(ref);
// memo[0] = {};
memo.push({ y: 0, x: 4 });


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
// export default (player) => ({
//   // Make the ‘computer’ capable of making random plays.
//   // The AI does not have to be smart,
//   // But it should know whether or not a given move is legal
//   // (i.e. it shouldn’t shoot the same coordinate twice).
//   shots: [],
//   generateRandomCoordinate: () => {
//     // Returns random coordinate with values between 1 and 10
//     const coordinate = [];
//     for (let i = 0; i < 2; i += 1) {
//       coordinate.push(Math.floor(Math.random() * 10 + 1));
//     }
//     return coordinate;
//   },
//   attack: () => {
//     // Returns a random unique coordinate that is in-bounds of the board
//     // Note, if shots.length is 100, game will be over
//     // There are only 100 coordinates to attack
//     while (player.shots.length < 100) {
//       let [x, y] = player.generateRandomCoordinate();
//       if (!player.shots.find(([a, b]) => a === x && b === y)) {
//         player.opponentBoard.receiveAttack([x, y]);
//         player.shots.push([x, y]);
//       }
//     }
//   },
// });

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
  const uuid = crypto.randomUUID();
  return uuid.substring(0, uuid.indexOf('-'));
});


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
module.exports = __webpack_require__.p + "040f5ee6b57564bdd2fc.svg";

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__("./src/app.js"));
/******/ }
]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsbUJBQW1CO0FBQzVFOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsa0JBQWtCO0FBQ2pDLGVBQWUsUUFBUTtBQUN2QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVB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Ozs7Ozs7Ozs7Ozs7O0FDcEJGLGlFQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLENBQUMsRUFBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN2Q3dDOztBQUUxQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQSxVQUFVO0FBQ1Ysa0NBQWtDLHlEQUFZO0FBQzlDLFVBQVU7QUFDVjtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNIO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNILENBQUM7O0FBRWM7QUFDZjs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7O0FDaERBLGlFQUFlO0FBQ2Y7QUFDQTtBQUNBLENBQUMsRUFBQyIsInNvdXJjZXMiOlsid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvQGljb25mdS9zdmctaW5qZWN0L2Rpc3Qvc3ZnLWluamVjdC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaGVhZGVyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9ob21lLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9uYXZiYXIuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3BvcnQuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvZ2V0VXJsLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5jc3M/YTY3MiIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9oZWFkZXIuY3NzP2U2OGIiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaG9tZS5jc3M/NGI1MSIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9uYXZiYXIuY3NzP2MxZGIiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbm90aWZpY2F0aW9ucy5jc3M/MmQyZCIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9wb3J0LmNzcz8zNGVmIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzPzM0MWUiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL2hlYWRlci5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9oZWFkZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9uYXZiYXIvbmF2YmFyLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25hdmJhci9uYXZiYXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvbWFpbi9tYWluLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvbWFpbi9tYWluLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vY29tcG9zZUdhbWUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3NjcmVlbi9wbGF5R2FtZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvc2NyZWVuL3BvcnQuY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vc2NyZWVuQ29udHJvbGxlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvZ2FtZUNvbnRyb2xsZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2dhbWVib2FyZC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvaXNDb21wdXRlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvaXNIdW1hbi5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcGlwZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcGxheWVyLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9wdWJTdWIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3NoaXAuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9oZWxwZXJzL2dlbmVyYXRlVVVJRC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFNWR0luamVjdCAtIFZlcnNpb24gMS4yLjNcbiAqIEEgdGlueSwgaW50dWl0aXZlLCByb2J1c3QsIGNhY2hpbmcgc29sdXRpb24gZm9yIGluamVjdGluZyBTVkcgZmlsZXMgaW5saW5lIGludG8gdGhlIERPTS5cbiAqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaWNvbmZ1L3N2Zy1pbmplY3RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTggSU5DT1JTLCB0aGUgY3JlYXRvcnMgb2YgaWNvbmZ1LmNvbVxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgLSBodHRwczovL2dpdGh1Yi5jb20vaWNvbmZ1L3N2Zy1pbmplY3QvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbihmdW5jdGlvbih3aW5kb3csIGRvY3VtZW50KSB7XG4gIC8vIGNvbnN0YW50cyBmb3IgYmV0dGVyIG1pbmlmaWNhdGlvblxuICB2YXIgX0NSRUFURV9FTEVNRU5UXyA9ICdjcmVhdGVFbGVtZW50JztcbiAgdmFyIF9HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfID0gJ2dldEVsZW1lbnRzQnlUYWdOYW1lJztcbiAgdmFyIF9MRU5HVEhfID0gJ2xlbmd0aCc7XG4gIHZhciBfU1RZTEVfID0gJ3N0eWxlJztcbiAgdmFyIF9USVRMRV8gPSAndGl0bGUnO1xuICB2YXIgX1VOREVGSU5FRF8gPSAndW5kZWZpbmVkJztcbiAgdmFyIF9TRVRfQVRUUklCVVRFXyA9ICdzZXRBdHRyaWJ1dGUnO1xuICB2YXIgX0dFVF9BVFRSSUJVVEVfID0gJ2dldEF0dHJpYnV0ZSc7XG5cbiAgdmFyIE5VTEwgPSBudWxsO1xuXG4gIC8vIGNvbnN0YW50c1xuICB2YXIgX19TVkdJTkpFQ1QgPSAnX19zdmdJbmplY3QnO1xuICB2YXIgSURfU1VGRklYID0gJy0taW5qZWN0LSc7XG4gIHZhciBJRF9TVUZGSVhfUkVHRVggPSBuZXcgUmVnRXhwKElEX1NVRkZJWCArICdcXFxcZCsnLCBcImdcIik7XG4gIHZhciBMT0FEX0ZBSUwgPSAnTE9BRF9GQUlMJztcbiAgdmFyIFNWR19OT1RfU1VQUE9SVEVEID0gJ1NWR19OT1RfU1VQUE9SVEVEJztcbiAgdmFyIFNWR19JTlZBTElEID0gJ1NWR19JTlZBTElEJztcbiAgdmFyIEFUVFJJQlVURV9FWENMVVNJT05fTkFNRVMgPSBbJ3NyYycsICdhbHQnLCAnb25sb2FkJywgJ29uZXJyb3InXTtcbiAgdmFyIEFfRUxFTUVOVCA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF9dKCdhJyk7XG4gIHZhciBJU19TVkdfU1VQUE9SVEVEID0gdHlwZW9mIFNWR1JlY3QgIT0gX1VOREVGSU5FRF87XG4gIHZhciBERUZBVUxUX09QVElPTlMgPSB7XG4gICAgdXNlQ2FjaGU6IHRydWUsXG4gICAgY29weUF0dHJpYnV0ZXM6IHRydWUsXG4gICAgbWFrZUlkc1VuaXF1ZTogdHJ1ZVxuICB9O1xuICAvLyBNYXAgb2YgSVJJIHJlZmVyZW5jZWFibGUgdGFnIG5hbWVzIHRvIHByb3BlcnRpZXMgdGhhdCBjYW4gcmVmZXJlbmNlIHRoZW0uIFRoaXMgaXMgZGVmaW5lZCBpblxuICAvLyBodHRwczovL3d3dy53My5vcmcvVFIvU1ZHMTEvbGlua2luZy5odG1sI3Byb2Nlc3NpbmdJUklcbiAgdmFyIElSSV9UQUdfUFJPUEVSVElFU19NQVAgPSB7XG4gICAgY2xpcFBhdGg6IFsnY2xpcC1wYXRoJ10sXG4gICAgJ2NvbG9yLXByb2ZpbGUnOiBOVUxMLFxuICAgIGN1cnNvcjogTlVMTCxcbiAgICBmaWx0ZXI6IE5VTEwsXG4gICAgbGluZWFyR3JhZGllbnQ6IFsnZmlsbCcsICdzdHJva2UnXSxcbiAgICBtYXJrZXI6IFsnbWFya2VyJywgJ21hcmtlci1lbmQnLCAnbWFya2VyLW1pZCcsICdtYXJrZXItc3RhcnQnXSxcbiAgICBtYXNrOiBOVUxMLFxuICAgIHBhdHRlcm46IFsnZmlsbCcsICdzdHJva2UnXSxcbiAgICByYWRpYWxHcmFkaWVudDogWydmaWxsJywgJ3N0cm9rZSddXG4gIH07XG4gIHZhciBJTkpFQ1RFRCA9IDE7XG4gIHZhciBGQUlMID0gMjtcblxuICB2YXIgdW5pcXVlSWRDb3VudGVyID0gMTtcbiAgdmFyIHhtbFNlcmlhbGl6ZXI7XG4gIHZhciBkb21QYXJzZXI7XG5cblxuICAvLyBjcmVhdGVzIGFuIFNWRyBkb2N1bWVudCBmcm9tIGFuIFNWRyBzdHJpbmdcbiAgZnVuY3Rpb24gc3ZnU3RyaW5nVG9TdmdEb2Moc3ZnU3RyKSB7XG4gICAgZG9tUGFyc2VyID0gZG9tUGFyc2VyIHx8IG5ldyBET01QYXJzZXIoKTtcbiAgICByZXR1cm4gZG9tUGFyc2VyLnBhcnNlRnJvbVN0cmluZyhzdmdTdHIsICd0ZXh0L3htbCcpO1xuICB9XG5cblxuICAvLyBzZWFyaWFsaXplcyBhbiBTVkcgZWxlbWVudCB0byBhbiBTVkcgc3RyaW5nXG4gIGZ1bmN0aW9uIHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtZW50KSB7XG4gICAgeG1sU2VyaWFsaXplciA9IHhtbFNlcmlhbGl6ZXIgfHwgbmV3IFhNTFNlcmlhbGl6ZXIoKTtcbiAgICByZXR1cm4geG1sU2VyaWFsaXplci5zZXJpYWxpemVUb1N0cmluZyhzdmdFbGVtZW50KTtcbiAgfVxuXG5cbiAgLy8gUmV0dXJucyB0aGUgYWJzb2x1dGUgdXJsIGZvciB0aGUgc3BlY2lmaWVkIHVybFxuICBmdW5jdGlvbiBnZXRBYnNvbHV0ZVVybCh1cmwpIHtcbiAgICBBX0VMRU1FTlQuaHJlZiA9IHVybDtcbiAgICByZXR1cm4gQV9FTEVNRU5ULmhyZWY7XG4gIH1cblxuXG4gIC8vIExvYWQgc3ZnIHdpdGggYW4gWEhSIHJlcXVlc3RcbiAgZnVuY3Rpb24gbG9hZFN2Zyh1cmwsIGNhbGxiYWNrLCBlcnJvckNhbGxiYWNrKSB7XG4gICAgaWYgKHVybCkge1xuICAgICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgIC8vIHJlYWR5U3RhdGUgaXMgRE9ORVxuICAgICAgICAgIHZhciBzdGF0dXMgPSByZXEuc3RhdHVzO1xuICAgICAgICAgIGlmIChzdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyBpcyBPS1xuICAgICAgICAgICAgY2FsbGJhY2socmVxLnJlc3BvbnNlWE1MLCByZXEucmVzcG9uc2VUZXh0LnRyaW0oKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyBpcyBlcnJvciAoNHh4IG9yIDV4eClcbiAgICAgICAgICAgIGVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PSAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyAwIGNhbiBpbmRpY2F0ZSBhIGZhaWxlZCBjcm9zcy1kb21haW4gY2FsbFxuICAgICAgICAgICAgZXJyb3JDYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgICAgcmVxLnNlbmQoKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIENvcHkgYXR0cmlidXRlcyBmcm9tIGltZyBlbGVtZW50IHRvIHN2ZyBlbGVtZW50XG4gIGZ1bmN0aW9uIGNvcHlBdHRyaWJ1dGVzKGltZ0VsZW0sIHN2Z0VsZW0pIHtcbiAgICB2YXIgYXR0cmlidXRlO1xuICAgIHZhciBhdHRyaWJ1dGVOYW1lO1xuICAgIHZhciBhdHRyaWJ1dGVWYWx1ZTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGltZ0VsZW0uYXR0cmlidXRlcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJpYnV0ZXNbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgIGF0dHJpYnV0ZSA9IGF0dHJpYnV0ZXNbaV07XG4gICAgICBhdHRyaWJ1dGVOYW1lID0gYXR0cmlidXRlLm5hbWU7XG4gICAgICAvLyBPbmx5IGNvcHkgYXR0cmlidXRlcyBub3QgZXhwbGljaXRseSBleGNsdWRlZCBmcm9tIGNvcHlpbmdcbiAgICAgIGlmIChBVFRSSUJVVEVfRVhDTFVTSU9OX05BTUVTLmluZGV4T2YoYXR0cmlidXRlTmFtZSkgPT0gLTEpIHtcbiAgICAgICAgYXR0cmlidXRlVmFsdWUgPSBhdHRyaWJ1dGUudmFsdWU7XG4gICAgICAgIC8vIElmIGltZyBhdHRyaWJ1dGUgaXMgXCJ0aXRsZVwiLCBpbnNlcnQgYSB0aXRsZSBlbGVtZW50IGludG8gU1ZHIGVsZW1lbnRcbiAgICAgICAgaWYgKGF0dHJpYnV0ZU5hbWUgPT0gX1RJVExFXykge1xuICAgICAgICAgIHZhciB0aXRsZUVsZW07XG4gICAgICAgICAgdmFyIGZpcnN0RWxlbWVudENoaWxkID0gc3ZnRWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICBpZiAoZmlyc3RFbGVtZW50Q2hpbGQgJiYgZmlyc3RFbGVtZW50Q2hpbGQubG9jYWxOYW1lLnRvTG93ZXJDYXNlKCkgPT0gX1RJVExFXykge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFNWRyBlbGVtZW50J3MgZmlyc3QgY2hpbGQgaXMgYSB0aXRsZSBlbGVtZW50LCBrZWVwIGl0IGFzIHRoZSB0aXRsZSBlbGVtZW50XG4gICAgICAgICAgICB0aXRsZUVsZW0gPSBmaXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFNWRyBlbGVtZW50J3MgZmlyc3QgY2hpbGQgZWxlbWVudCBpcyBub3QgYSB0aXRsZSBlbGVtZW50LCBjcmVhdGUgYSBuZXcgdGl0bGVcbiAgICAgICAgICAgIC8vIGVsZSxlbXQgYW5kIHNldCBpdCBhcyB0aGUgZmlyc3QgY2hpbGRcbiAgICAgICAgICAgIHRpdGxlRWxlbSA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF8gKyAnTlMnXSgnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCBfVElUTEVfKTtcbiAgICAgICAgICAgIHN2Z0VsZW0uaW5zZXJ0QmVmb3JlKHRpdGxlRWxlbSwgZmlyc3RFbGVtZW50Q2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTZXQgbmV3IHRpdGxlIGNvbnRlbnRcbiAgICAgICAgICB0aXRsZUVsZW0udGV4dENvbnRlbnQgPSBhdHRyaWJ1dGVWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBTZXQgaW1nIGF0dHJpYnV0ZSB0byBzdmcgZWxlbWVudFxuICAgICAgICAgIHN2Z0VsZW1bX1NFVF9BVFRSSUJVVEVfXShhdHRyaWJ1dGVOYW1lLCBhdHRyaWJ1dGVWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8vIFRoaXMgZnVuY3Rpb24gYXBwZW5kcyBhIHN1ZmZpeCB0byBJRHMgb2YgcmVmZXJlbmNlZCBlbGVtZW50cyBpbiB0aGUgPGRlZnM+IGluIG9yZGVyIHRvICB0byBhdm9pZCBJRCBjb2xsaXNpb25cbiAgLy8gYmV0d2VlbiBtdWx0aXBsZSBpbmplY3RlZCBTVkdzLiBUaGUgc3VmZml4IGhhcyB0aGUgZm9ybSBcIi0taW5qZWN0LVhcIiwgd2hlcmUgWCBpcyBhIHJ1bm5pbmcgbnVtYmVyIHdoaWNoIGlzXG4gIC8vIGluY3JlbWVudGVkIHdpdGggZWFjaCBpbmplY3Rpb24uIFJlZmVyZW5jZXMgdG8gdGhlIElEcyBhcmUgYWRqdXN0ZWQgYWNjb3JkaW5nbHkuXG4gIC8vIFdlIGFzc3VtZSB0aGEgYWxsIElEcyB3aXRoaW4gdGhlIGluamVjdGVkIFNWRyBhcmUgdW5pcXVlLCB0aGVyZWZvcmUgdGhlIHNhbWUgc3VmZml4IGNhbiBiZSB1c2VkIGZvciBhbGwgSURzIG9mIG9uZVxuICAvLyBpbmplY3RlZCBTVkcuXG4gIC8vIElmIHRoZSBvbmx5UmVmZXJlbmNlZCBhcmd1bWVudCBpcyBzZXQgdG8gdHJ1ZSwgb25seSB0aG9zZSBJRHMgd2lsbCBiZSBtYWRlIHVuaXF1ZSB0aGF0IGFyZSByZWZlcmVuY2VkIGZyb20gd2l0aGluIHRoZSBTVkdcbiAgZnVuY3Rpb24gbWFrZUlkc1VuaXF1ZShzdmdFbGVtLCBvbmx5UmVmZXJlbmNlZCkge1xuICAgIHZhciBpZFN1ZmZpeCA9IElEX1NVRkZJWCArIHVuaXF1ZUlkQ291bnRlcisrO1xuICAgIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbiBmb3IgZnVuY3Rpb25hbCBub3RhdGlvbnMgb2YgYW4gSVJJIHJlZmVyZW5jZXMuIFRoaXMgd2lsbCBmaW5kIG9jY3VyZW5jZXMgaW4gdGhlIGZvcm1cbiAgICAvLyB1cmwoI2FueUlkKSBvciB1cmwoXCIjYW55SWRcIikgKGZvciBJbnRlcm5ldCBFeHBsb3JlcikgYW5kIGNhcHR1cmUgdGhlIHJlZmVyZW5jZWQgSURcbiAgICB2YXIgZnVuY0lyaVJlZ2V4ID0gL3VybFxcKFwiPyMoW2EtekEtWl1bXFx3Oi4tXSopXCI/XFwpL2c7XG4gICAgLy8gR2V0IGFsbCBlbGVtZW50cyB3aXRoIGFuIElELiBUaGUgU1ZHIHNwZWMgcmVjb21tZW5kcyB0byBwdXQgcmVmZXJlbmNlZCBlbGVtZW50cyBpbnNpZGUgPGRlZnM+IGVsZW1lbnRzLCBidXRcbiAgICAvLyB0aGlzIGlzIG5vdCBhIHJlcXVpcmVtZW50LCB0aGVyZWZvcmUgd2UgaGF2ZSB0byBzZWFyY2ggZm9yIElEcyBpbiB0aGUgd2hvbGUgU1ZHLlxuICAgIHZhciBpZEVsZW1lbnRzID0gc3ZnRWxlbS5xdWVyeVNlbGVjdG9yQWxsKCdbaWRdJyk7XG4gICAgdmFyIGlkRWxlbTtcbiAgICAvLyBBbiBvYmplY3QgY29udGFpbmluZyByZWZlcmVuY2VkIElEcyAgYXMga2V5cyBpcyB1c2VkIGlmIG9ubHkgcmVmZXJlbmNlZCBJRHMgc2hvdWxkIGJlIHVuaXF1aWZpZWQuXG4gICAgLy8gSWYgdGhpcyBvYmplY3QgZG9lcyBub3QgZXhpc3QsIGFsbCBJRHMgd2lsbCBiZSB1bmlxdWlmaWVkLlxuICAgIHZhciByZWZlcmVuY2VkSWRzID0gb25seVJlZmVyZW5jZWQgPyBbXSA6IE5VTEw7XG4gICAgdmFyIHRhZ05hbWU7XG4gICAgdmFyIGlyaVRhZ05hbWVzID0ge307XG4gICAgdmFyIGlyaVByb3BlcnRpZXMgPSBbXTtcbiAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgIHZhciBpLCBqO1xuXG4gICAgaWYgKGlkRWxlbWVudHNbX0xFTkdUSF9dKSB7XG4gICAgICAvLyBNYWtlIGFsbCBJRHMgdW5pcXVlIGJ5IGFkZGluZyB0aGUgSUQgc3VmZml4IGFuZCBjb2xsZWN0IGFsbCBlbmNvdW50ZXJlZCB0YWcgbmFtZXNcbiAgICAgIC8vIHRoYXQgYXJlIElSSSByZWZlcmVuY2VhYmxlIGZyb20gcHJvcGVyaXRpZXMuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgaWRFbGVtZW50c1tfTEVOR1RIX107IGkrKykge1xuICAgICAgICB0YWdOYW1lID0gaWRFbGVtZW50c1tpXS5sb2NhbE5hbWU7IC8vIFVzZSBub24tbmFtZXNwYWNlZCB0YWcgbmFtZVxuICAgICAgICAvLyBNYWtlIElEIHVuaXF1ZSBpZiB0YWcgbmFtZSBpcyBJUkkgcmVmZXJlbmNlYWJsZVxuICAgICAgICBpZiAodGFnTmFtZSBpbiBJUklfVEFHX1BST1BFUlRJRVNfTUFQKSB7XG4gICAgICAgICAgaXJpVGFnTmFtZXNbdGFnTmFtZV0gPSAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBHZXQgYWxsIHByb3BlcnRpZXMgdGhhdCBhcmUgbWFwcGVkIHRvIHRoZSBmb3VuZCBJUkkgcmVmZXJlbmNlYWJsZSB0YWdzXG4gICAgICBmb3IgKHRhZ05hbWUgaW4gaXJpVGFnTmFtZXMpIHtcbiAgICAgICAgKElSSV9UQUdfUFJPUEVSVElFU19NQVBbdGFnTmFtZV0gfHwgW3RhZ05hbWVdKS5mb3JFYWNoKGZ1bmN0aW9uIChtYXBwZWRQcm9wZXJ0eSkge1xuICAgICAgICAgIC8vIEFkZCBtYXBwZWQgcHJvcGVydGllcyB0byBhcnJheSBvZiBpcmkgcmVmZXJlbmNpbmcgcHJvcGVydGllcy5cbiAgICAgICAgICAvLyBVc2UgbGluZWFyIHNlYXJjaCBoZXJlIGJlY2F1c2UgdGhlIG51bWJlciBvZiBwb3NzaWJsZSBlbnRyaWVzIGlzIHZlcnkgc21hbGwgKG1heGltdW0gMTEpXG4gICAgICAgICAgaWYgKGlyaVByb3BlcnRpZXMuaW5kZXhPZihtYXBwZWRQcm9wZXJ0eSkgPCAwKSB7XG4gICAgICAgICAgICBpcmlQcm9wZXJ0aWVzLnB1c2gobWFwcGVkUHJvcGVydHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoaXJpUHJvcGVydGllc1tfTEVOR1RIX10pIHtcbiAgICAgICAgLy8gQWRkIFwic3R5bGVcIiB0byBwcm9wZXJ0aWVzLCBiZWNhdXNlIGl0IG1heSBjb250YWluIHJlZmVyZW5jZXMgaW4gdGhlIGZvcm0gJ3N0eWxlPVwiZmlsbDp1cmwoI215RmlsbClcIidcbiAgICAgICAgaXJpUHJvcGVydGllcy5wdXNoKF9TVFlMRV8pO1xuICAgICAgfVxuICAgICAgLy8gUnVuIHRocm91Z2ggYWxsIGVsZW1lbnRzIG9mIHRoZSBTVkcgYW5kIHJlcGxhY2UgSURzIGluIHJlZmVyZW5jZXMuXG4gICAgICAvLyBUbyBnZXQgYWxsIGRlc2NlbmRpbmcgZWxlbWVudHMsIGdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykgc2VlbXMgdG8gcGVyZm9ybSBmYXN0ZXIgdGhhbiBxdWVyeVNlbGVjdG9yQWxsKCcqJykuXG4gICAgICAvLyBTaW5jZSBzdmdFbGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykgZG9lcyBub3QgcmV0dXJuIHRoZSBzdmcgZWxlbWVudCBpdHNlbGYsIHdlIGhhdmUgdG8gaGFuZGxlIGl0IHNlcGFyYXRlbHkuXG4gICAgICB2YXIgZGVzY0VsZW1lbnRzID0gc3ZnRWxlbVtfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FX10oJyonKTtcbiAgICAgIHZhciBlbGVtZW50ID0gc3ZnRWxlbTtcbiAgICAgIHZhciBwcm9wZXJ0eU5hbWU7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgbmV3VmFsdWU7XG4gICAgICBmb3IgKGkgPSAtMTsgZWxlbWVudCAhPSBOVUxMOykge1xuICAgICAgICBpZiAoZWxlbWVudC5sb2NhbE5hbWUgPT0gX1NUWUxFXykge1xuICAgICAgICAgIC8vIElmIGVsZW1lbnQgaXMgYSBzdHlsZSBlbGVtZW50LCByZXBsYWNlIElEcyBpbiBhbGwgb2NjdXJlbmNlcyBvZiBcInVybCgjYW55SWQpXCIgaW4gdGV4dCBjb250ZW50XG4gICAgICAgICAgdmFsdWUgPSBlbGVtZW50LnRleHRDb250ZW50O1xuICAgICAgICAgIG5ld1ZhbHVlID0gdmFsdWUgJiYgdmFsdWUucmVwbGFjZShmdW5jSXJpUmVnZXgsIGZ1bmN0aW9uKG1hdGNoLCBpZCkge1xuICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgcmVmZXJlbmNlZElkc1tpZF0gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICd1cmwoIycgKyBpZCArIGlkU3VmZml4ICsgJyknO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIGVsZW1lbnQudGV4dENvbnRlbnQgPSBuZXdWYWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgICAvLyBSdW4gdGhyb3VnaCBhbGwgcHJvcGVydHkgbmFtZXMgZm9yIHdoaWNoIElEcyB3ZXJlIGZvdW5kXG4gICAgICAgICAgZm9yIChqID0gMDsgaiA8IGlyaVByb3BlcnRpZXNbX0xFTkdUSF9dOyBqKyspIHtcbiAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IGlyaVByb3BlcnRpZXNbal07XG4gICAgICAgICAgICB2YWx1ZSA9IGVsZW1lbnRbX0dFVF9BVFRSSUJVVEVfXShwcm9wZXJ0eU5hbWUpO1xuICAgICAgICAgICAgbmV3VmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS5yZXBsYWNlKGZ1bmNJcmlSZWdleCwgZnVuY3Rpb24obWF0Y2gsIGlkKSB7XG4gICAgICAgICAgICAgIGlmIChyZWZlcmVuY2VkSWRzKSB7XG4gICAgICAgICAgICAgICAgcmVmZXJlbmNlZElkc1tpZF0gPSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICd1cmwoIycgKyBpZCArIGlkU3VmZml4ICsgJyknO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRbX1NFVF9BVFRSSUJVVEVfXShwcm9wZXJ0eU5hbWUsIG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVwbGFjZSBJRHMgaW4geGxpbms6cmVmIGFuZCBocmVmIGF0dHJpYnV0ZXNcbiAgICAgICAgICBbJ3hsaW5rOmhyZWYnLCAnaHJlZiddLmZvckVhY2goZnVuY3Rpb24ocmVmQXR0ck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpcmkgPSBlbGVtZW50W19HRVRfQVRUUklCVVRFX10ocmVmQXR0ck5hbWUpO1xuICAgICAgICAgICAgaWYgKC9eXFxzKiMvLnRlc3QoaXJpKSkgeyAvLyBDaGVjayBpZiBpcmkgaXMgbm9uLW51bGwgYW5kIGludGVybmFsIHJlZmVyZW5jZVxuICAgICAgICAgICAgICBpcmkgPSBpcmkudHJpbSgpO1xuICAgICAgICAgICAgICBlbGVtZW50W19TRVRfQVRUUklCVVRFX10ocmVmQXR0ck5hbWUsIGlyaSArIGlkU3VmZml4KTtcbiAgICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgSUQgdG8gcmVmZXJlbmNlZCBJRHNcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VkSWRzW2lyaS5zdWJzdHJpbmcoMSldID0gMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQgPSBkZXNjRWxlbWVudHNbKytpXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpZEVsZW1lbnRzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICAgIGlkRWxlbSA9IGlkRWxlbWVudHNbaV07XG4gICAgICAgIC8vIElmIHNldCBvZiByZWZlcmVuY2VkIElEcyBleGlzdHMsIG1ha2Ugb25seSByZWZlcmVuY2VkIElEcyB1bmlxdWUsXG4gICAgICAgIC8vIG90aGVyd2lzZSBtYWtlIGFsbCBJRHMgdW5pcXVlLlxuICAgICAgICBpZiAoIXJlZmVyZW5jZWRJZHMgfHwgcmVmZXJlbmNlZElkc1tpZEVsZW0uaWRdKSB7XG4gICAgICAgICAgLy8gQWRkIHN1ZmZpeCB0byBlbGVtZW50J3MgSURcbiAgICAgICAgICBpZEVsZW0uaWQgKz0gaWRTdWZmaXg7XG4gICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmV0dXJuIHRydWUgaWYgU1ZHIGVsZW1lbnQgaGFzIGNoYW5nZWRcbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG5cbiAgLy8gRm9yIGNhY2hlZCBTVkdzIHRoZSBJRHMgYXJlIG1hZGUgdW5pcXVlIGJ5IHNpbXBseSByZXBsYWNpbmcgdGhlIGFscmVhZHkgaW5zZXJ0ZWQgdW5pcXVlIElEcyB3aXRoIGFcbiAgLy8gaGlnaGVyIElEIGNvdW50ZXIuIFRoaXMgaXMgbXVjaCBtb3JlIHBlcmZvcm1hbnQgdGhhbiBhIGNhbGwgdG8gbWFrZUlkc1VuaXF1ZSgpLlxuICBmdW5jdGlvbiBtYWtlSWRzVW5pcXVlQ2FjaGVkKHN2Z1N0cmluZykge1xuICAgIHJldHVybiBzdmdTdHJpbmcucmVwbGFjZShJRF9TVUZGSVhfUkVHRVgsIElEX1NVRkZJWCArIHVuaXF1ZUlkQ291bnRlcisrKTtcbiAgfVxuXG5cbiAgLy8gSW5qZWN0IFNWRyBieSByZXBsYWNpbmcgdGhlIGltZyBlbGVtZW50IHdpdGggdGhlIFNWRyBlbGVtZW50IGluIHRoZSBET01cbiAgZnVuY3Rpb24gaW5qZWN0KGltZ0VsZW0sIHN2Z0VsZW0sIGFic1VybCwgb3B0aW9ucykge1xuICAgIGlmIChzdmdFbGVtKSB7XG4gICAgICBzdmdFbGVtW19TRVRfQVRUUklCVVRFX10oJ2RhdGEtaW5qZWN0LXVybCcsIGFic1VybCk7XG4gICAgICB2YXIgcGFyZW50Tm9kZSA9IGltZ0VsZW0ucGFyZW50Tm9kZTtcbiAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNvcHlBdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgY29weUF0dHJpYnV0ZXMoaW1nRWxlbSwgc3ZnRWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSW52b2tlIGJlZm9yZUluamVjdCBob29rIGlmIHNldFxuICAgICAgICB2YXIgYmVmb3JlSW5qZWN0ID0gb3B0aW9ucy5iZWZvcmVJbmplY3Q7XG4gICAgICAgIHZhciBpbmplY3RFbGVtID0gKGJlZm9yZUluamVjdCAmJiBiZWZvcmVJbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSkpIHx8IHN2Z0VsZW07XG4gICAgICAgIC8vIFJlcGxhY2UgaW1nIGVsZW1lbnQgd2l0aCBuZXcgZWxlbWVudC4gVGhpcyBpcyB0aGUgYWN0dWFsIGluamVjdGlvbi5cbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoaW5qZWN0RWxlbSwgaW1nRWxlbSk7XG4gICAgICAgIC8vIE1hcmsgaW1nIGVsZW1lbnQgYXMgaW5qZWN0ZWRcbiAgICAgICAgaW1nRWxlbVtfX1NWR0lOSkVDVF0gPSBJTkpFQ1RFRDtcbiAgICAgICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pO1xuICAgICAgICAvLyBJbnZva2UgYWZ0ZXJJbmplY3QgaG9vayBpZiBzZXRcbiAgICAgICAgdmFyIGFmdGVySW5qZWN0ID0gb3B0aW9ucy5hZnRlckluamVjdDtcbiAgICAgICAgaWYgKGFmdGVySW5qZWN0KSB7XG4gICAgICAgICAgYWZ0ZXJJbmplY3QoaW1nRWxlbSwgaW5qZWN0RWxlbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIE1lcmdlcyBhbnkgbnVtYmVyIG9mIG9wdGlvbnMgb2JqZWN0cyBpbnRvIGEgbmV3IG9iamVjdFxuICBmdW5jdGlvbiBtZXJnZU9wdGlvbnMoKSB7XG4gICAgdmFyIG1lcmdlZE9wdGlvbnMgPSB7fTtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAvLyBJdGVyYXRlIG92ZXIgYWxsIHNwZWNpZmllZCBvcHRpb25zIG9iamVjdHMgYW5kIGFkZCBhbGwgcHJvcGVydGllcyB0byB0aGUgbmV3IG9wdGlvbnMgb2JqZWN0XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICB2YXIgYXJndW1lbnQgPSBhcmdzW2ldO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnQpIHtcbiAgICAgICAgICBpZiAoYXJndW1lbnQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgbWVyZ2VkT3B0aW9uc1trZXldID0gYXJndW1lbnRba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICByZXR1cm4gbWVyZ2VkT3B0aW9ucztcbiAgfVxuXG5cbiAgLy8gQWRkcyB0aGUgc3BlY2lmaWVkIENTUyB0byB0aGUgZG9jdW1lbnQncyA8aGVhZD4gZWxlbWVudFxuICBmdW5jdGlvbiBhZGRTdHlsZVRvSGVhZChjc3MpIHtcbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50W19HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfXSgnaGVhZCcpWzBdO1xuICAgIGlmIChoZWFkKSB7XG4gICAgICB2YXIgc3R5bGUgPSBkb2N1bWVudFtfQ1JFQVRFX0VMRU1FTlRfXShfU1RZTEVfKTtcbiAgICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIEJ1aWxkcyBhbiBTVkcgZWxlbWVudCBmcm9tIHRoZSBzcGVjaWZpZWQgU1ZHIHN0cmluZ1xuICBmdW5jdGlvbiBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyLCB2ZXJpZnkpIHtcbiAgICBpZiAodmVyaWZ5KSB7XG4gICAgICB2YXIgc3ZnRG9jO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gUGFyc2UgdGhlIFNWRyBzdHJpbmcgd2l0aCBET01QYXJzZXJcbiAgICAgICAgc3ZnRG9jID0gc3ZnU3RyaW5nVG9TdmdEb2Moc3ZnU3RyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gTlVMTDtcbiAgICAgIH1cbiAgICAgIGlmIChzdmdEb2NbX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV9dKCdwYXJzZXJlcnJvcicpW19MRU5HVEhfXSkge1xuICAgICAgICAvLyBET01QYXJzZXIgZG9lcyBub3QgdGhyb3cgYW4gZXhjZXB0aW9uLCBidXQgaW5zdGVhZCBwdXRzIHBhcnNlcmVycm9yIHRhZ3MgaW4gdGhlIGRvY3VtZW50XG4gICAgICAgIHJldHVybiBOVUxMO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN2Z0RvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpdi5pbm5lckhUTUwgPSBzdmdTdHI7XG4gICAgICByZXR1cm4gZGl2LmZpcnN0RWxlbWVudENoaWxkO1xuICAgIH1cbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pIHtcbiAgICAvLyBSZW1vdmUgdGhlIG9ubG9hZCBhdHRyaWJ1dGUuIFNob3VsZCBvbmx5IGJlIHVzZWQgdG8gcmVtb3ZlIHRoZSB1bnN0eWxlZCBpbWFnZSBmbGFzaCBwcm90ZWN0aW9uIGFuZFxuICAgIC8vIG1ha2UgdGhlIGVsZW1lbnQgdmlzaWJsZSwgbm90IGZvciByZW1vdmluZyB0aGUgZXZlbnQgbGlzdGVuZXIuXG4gICAgaW1nRWxlbS5yZW1vdmVBdHRyaWJ1dGUoJ29ubG9hZCcpO1xuICB9XG5cblxuICBmdW5jdGlvbiBlcnJvck1lc3NhZ2UobXNnKSB7XG4gICAgY29uc29sZS5lcnJvcignU1ZHSW5qZWN0OiAnICsgbXNnKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZmFpbChpbWdFbGVtLCBzdGF0dXMsIG9wdGlvbnMpIHtcbiAgICBpbWdFbGVtW19fU1ZHSU5KRUNUXSA9IEZBSUw7XG4gICAgaWYgKG9wdGlvbnMub25GYWlsKSB7XG4gICAgICBvcHRpb25zLm9uRmFpbChpbWdFbGVtLCBzdGF0dXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvck1lc3NhZ2Uoc3RhdHVzKTtcbiAgICB9XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucykge1xuICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWdFbGVtKTtcbiAgICBmYWlsKGltZ0VsZW0sIFNWR19JTlZBTElELCBvcHRpb25zKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3ZnTm90U3VwcG9ydGVkKGltZ0VsZW0sIG9wdGlvbnMpIHtcbiAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSk7XG4gICAgZmFpbChpbWdFbGVtLCBTVkdfTk9UX1NVUFBPUlRFRCwgb3B0aW9ucyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpIHtcbiAgICBmYWlsKGltZ0VsZW0sIExPQURfRkFJTCwgb3B0aW9ucyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZ0VsZW0pIHtcbiAgICBpbWdFbGVtLm9ubG9hZCA9IE5VTEw7XG4gICAgaW1nRWxlbS5vbmVycm9yID0gTlVMTDtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gaW1nTm90U2V0KG1zZykge1xuICAgIGVycm9yTWVzc2FnZSgnbm8gaW1nIGVsZW1lbnQnKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gY3JlYXRlU1ZHSW5qZWN0KGdsb2JhbE5hbWUsIG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoREVGQVVMVF9PUFRJT05TLCBvcHRpb25zKTtcbiAgICB2YXIgc3ZnTG9hZENhY2hlID0ge307XG5cbiAgICBpZiAoSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgLy8gSWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgU1ZHLCBhZGQgYSBzbWFsbCBzdHlsZXNoZWV0IHRoYXQgaGlkZXMgdGhlIDxpbWc+IGVsZW1lbnRzIHVudGlsXG4gICAgICAvLyBpbmplY3Rpb24gaXMgZmluaXNoZWQuIFRoaXMgYXZvaWRzIHNob3dpbmcgdGhlIHVuc3R5bGVkIFNWR3MgYmVmb3JlIHN0eWxlIGlzIGFwcGxpZWQuXG4gICAgICBhZGRTdHlsZVRvSGVhZCgnaW1nW29ubG9hZF49XCInICsgZ2xvYmFsTmFtZSArICcoXCJde3Zpc2liaWxpdHk6aGlkZGVuO30nKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNWR0luamVjdFxuICAgICAqXG4gICAgICogSW5qZWN0cyB0aGUgU1ZHIHNwZWNpZmllZCBpbiB0aGUgYHNyY2AgYXR0cmlidXRlIG9mIHRoZSBzcGVjaWZpZWQgYGltZ2AgZWxlbWVudCBvciBhcnJheSBvZiBgaW1nYFxuICAgICAqIGVsZW1lbnRzLiBSZXR1cm5zIGEgUHJvbWlzZSBvYmplY3Qgd2hpY2ggcmVzb2x2ZXMgaWYgYWxsIHBhc3NlZCBpbiBgaW1nYCBlbGVtZW50cyBoYXZlIGVpdGhlciBiZWVuXG4gICAgICogaW5qZWN0ZWQgb3IgZmFpbGVkIHRvIGluamVjdCAoT25seSBpZiBhIGdsb2JhbCBQcm9taXNlIG9iamVjdCBpcyBhdmFpbGFibGUgbGlrZSBpbiBhbGwgbW9kZXJuIGJyb3dzZXJzXG4gICAgICogb3IgdGhyb3VnaCBhIHBvbHlmaWxsKS5cbiAgICAgKlxuICAgICAqIE9wdGlvbnM6XG4gICAgICogdXNlQ2FjaGU6IElmIHNldCB0byBgdHJ1ZWAgdGhlIFNWRyB3aWxsIGJlIGNhY2hlZCB1c2luZyB0aGUgYWJzb2x1dGUgVVJMLiBEZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC5cbiAgICAgKiBjb3B5QXR0cmlidXRlczogSWYgc2V0IHRvIGB0cnVlYCB0aGUgYXR0cmlidXRlcyB3aWxsIGJlIGNvcGllZCBmcm9tIGBpbWdgIHRvIGBzdmdgLiBEZmF1bHQgdmFsdWVcbiAgICAgKiAgICAgaXMgYHRydWVgLlxuICAgICAqIG1ha2VJZHNVbmlxdWU6IElmIHNldCB0byBgdHJ1ZWAgdGhlIElEIG9mIGVsZW1lbnRzIGluIHRoZSBgPGRlZnM+YCBlbGVtZW50IHRoYXQgY2FuIGJlIHJlZmVyZW5jZXMgYnlcbiAgICAgKiAgICAgcHJvcGVydHkgdmFsdWVzIChmb3IgZXhhbXBsZSAnY2xpcFBhdGgnKSBhcmUgbWFkZSB1bmlxdWUgYnkgYXBwZW5kaW5nIFwiLS1pbmplY3QtWFwiLCB3aGVyZSBYIGlzIGFcbiAgICAgKiAgICAgcnVubmluZyBudW1iZXIgd2hpY2ggaW5jcmVhc2VzIHdpdGggZWFjaCBpbmplY3Rpb24uIFRoaXMgaXMgZG9uZSB0byBhdm9pZCBkdXBsaWNhdGUgSURzIGluIHRoZSBET00uXG4gICAgICogYmVmb3JlTG9hZDogSG9vayBiZWZvcmUgU1ZHIGlzIGxvYWRlZC4gVGhlIGBpbWdgIGVsZW1lbnQgaXMgcGFzc2VkIGFzIGEgcGFyYW1ldGVyLiBJZiB0aGUgaG9vayByZXR1cm5zXG4gICAgICogICAgIGEgc3RyaW5nIGl0IGlzIHVzZWQgYXMgdGhlIFVSTCBpbnN0ZWFkIG9mIHRoZSBgaW1nYCBlbGVtZW50J3MgYHNyY2AgYXR0cmlidXRlLlxuICAgICAqIGFmdGVyTG9hZDogSG9vayBhZnRlciBTVkcgaXMgbG9hZGVkLiBUaGUgbG9hZGVkIGBzdmdgIGVsZW1lbnQgYW5kIGBzdmdgIHN0cmluZyBhcmUgcGFzc2VkIGFzIGFcbiAgICAgKiAgICAgcGFyYW1ldGVycy4gSWYgY2FjaGluZyBpcyBhY3RpdmUgdGhpcyBob29rIHdpbGwgb25seSBnZXQgY2FsbGVkIG9uY2UgZm9yIGluamVjdGVkIFNWR3Mgd2l0aCB0aGVcbiAgICAgKiAgICAgc2FtZSBhYnNvbHV0ZSBwYXRoLiBDaGFuZ2VzIHRvIHRoZSBgc3ZnYCBlbGVtZW50IGluIHRoaXMgaG9vayB3aWxsIGJlIGFwcGxpZWQgdG8gYWxsIGluamVjdGVkIFNWR3NcbiAgICAgKiAgICAgd2l0aCB0aGUgc2FtZSBhYnNvbHV0ZSBwYXRoLiBJdCdzIGFsc28gcG9zc2libGUgdG8gcmV0dXJuIGFuIGBzdmdgIHN0cmluZyBvciBgc3ZnYCBlbGVtZW50IHdoaWNoXG4gICAgICogICAgIHdpbGwgdGhlbiBiZSB1c2VkIGZvciB0aGUgaW5qZWN0aW9uLlxuICAgICAqIGJlZm9yZUluamVjdDogSG9vayBiZWZvcmUgU1ZHIGlzIGluamVjdGVkLiBUaGUgYGltZ2AgYW5kIGBzdmdgIGVsZW1lbnRzIGFyZSBwYXNzZWQgYXMgcGFyYW1ldGVycy4gSWZcbiAgICAgKiAgICAgYW55IGh0bWwgZWxlbWVudCBpcyByZXR1cm5lZCBpdCBnZXRzIGluamVjdGVkIGluc3RlYWQgb2YgYXBwbHlpbmcgdGhlIGRlZmF1bHQgU1ZHIGluamVjdGlvbi5cbiAgICAgKiBhZnRlckluamVjdDogSG9vayBhZnRlciBTVkcgaXMgaW5qZWN0ZWQuIFRoZSBgaW1nYCBhbmQgYHN2Z2AgZWxlbWVudHMgYXJlIHBhc3NlZCBhcyBwYXJhbWV0ZXJzLlxuICAgICAqIG9uQWxsRmluaXNoOiBIb29rIGFmdGVyIGFsbCBgaW1nYCBlbGVtZW50cyBwYXNzZWQgdG8gYW4gU1ZHSW5qZWN0KCkgY2FsbCBoYXZlIGVpdGhlciBiZWVuIGluamVjdGVkIG9yXG4gICAgICogICAgIGZhaWxlZCB0byBpbmplY3QuXG4gICAgICogb25GYWlsOiBIb29rIGFmdGVyIGluamVjdGlvbiBmYWlscy4gVGhlIGBpbWdgIGVsZW1lbnQgYW5kIGEgYHN0YXR1c2Agc3RyaW5nIGFyZSBwYXNzZWQgYXMgYW4gcGFyYW1ldGVyLlxuICAgICAqICAgICBUaGUgYHN0YXR1c2AgY2FuIGJlIGVpdGhlciBgJ1NWR19OT1RfU1VQUE9SVEVEJ2AgKHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgU1ZHKSxcbiAgICAgKiAgICAgYCdTVkdfSU5WQUxJRCdgICh0aGUgU1ZHIGlzIG5vdCBpbiBhIHZhbGlkIGZvcm1hdCkgb3IgYCdMT0FEX0ZBSUxFRCdgIChsb2FkaW5nIG9mIHRoZSBTVkcgZmFpbGVkKS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEltYWdlRWxlbWVudH0gaW1nIC0gYW4gaW1nIGVsZW1lbnQgb3IgYW4gYXJyYXkgb2YgaW1nIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIG9wdGlvbmFsIHBhcmFtZXRlciB3aXRoIFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIHRoaXMgaW5qZWN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNWR0luamVjdChpbWcsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgICB2YXIgcnVuID0gZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICB2YXIgYWxsRmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG9uQWxsRmluaXNoID0gb3B0aW9ucy5vbkFsbEZpbmlzaDtcbiAgICAgICAgICBpZiAob25BbGxGaW5pc2gpIHtcbiAgICAgICAgICAgIG9uQWxsRmluaXNoKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUgJiYgcmVzb2x2ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChpbWcgJiYgdHlwZW9mIGltZ1tfTEVOR1RIX10gIT0gX1VOREVGSU5FRF8pIHtcbiAgICAgICAgICAvLyBhbiBhcnJheSBsaWtlIHN0cnVjdHVyZSBvZiBpbWcgZWxlbWVudHNcbiAgICAgICAgICB2YXIgaW5qZWN0SW5kZXggPSAwO1xuICAgICAgICAgIHZhciBpbmplY3RDb3VudCA9IGltZ1tfTEVOR1RIX107XG5cbiAgICAgICAgICBpZiAoaW5qZWN0Q291bnQgPT0gMCkge1xuICAgICAgICAgICAgYWxsRmluaXNoKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBmaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKCsraW5qZWN0SW5kZXggPT0gaW5qZWN0Q291bnQpIHtcbiAgICAgICAgICAgICAgICBhbGxGaW5pc2goKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmplY3RDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICAgIFNWR0luamVjdEVsZW1lbnQoaW1nW2ldLCBvcHRpb25zLCBmaW5pc2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvbmx5IG9uZSBpbWcgZWxlbWVudFxuICAgICAgICAgIFNWR0luamVjdEVsZW1lbnQoaW1nLCBvcHRpb25zLCBhbGxGaW5pc2gpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyByZXR1cm4gYSBQcm9taXNlIG9iamVjdCBpZiBnbG9iYWxseSBhdmFpbGFibGVcbiAgICAgIHJldHVybiB0eXBlb2YgUHJvbWlzZSA9PSBfVU5ERUZJTkVEXyA/IHJ1bigpIDogbmV3IFByb21pc2UocnVuKTtcbiAgICB9XG5cblxuICAgIC8vIEluamVjdHMgYSBzaW5nbGUgc3ZnIGVsZW1lbnQuIE9wdGlvbnMgbXVzdCBiZSBhbHJlYWR5IG1lcmdlZCB3aXRoIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAgZnVuY3Rpb24gU1ZHSW5qZWN0RWxlbWVudChpbWdFbGVtLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgaWYgKGltZ0VsZW0pIHtcbiAgICAgICAgdmFyIHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlID0gaW1nRWxlbVtfX1NWR0lOSkVDVF07XG4gICAgICAgIGlmICghc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUpIHtcbiAgICAgICAgICByZW1vdmVFdmVudExpc3RlbmVycyhpbWdFbGVtKTtcblxuICAgICAgICAgIGlmICghSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgICAgICAgc3ZnTm90U3VwcG9ydGVkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSW52b2tlIGJlZm9yZUxvYWQgaG9vayBpZiBzZXQuIElmIHRoZSBiZWZvcmVMb2FkIHJldHVybnMgYSB2YWx1ZSB1c2UgaXQgYXMgdGhlIHNyYyBmb3IgdGhlIGxvYWRcbiAgICAgICAgICAvLyBVUkwgcGF0aC4gRWxzZSB1c2UgdGhlIGltZ0VsZW0ncyBzcmMgYXR0cmlidXRlIHZhbHVlLlxuICAgICAgICAgIHZhciBiZWZvcmVMb2FkID0gb3B0aW9ucy5iZWZvcmVMb2FkO1xuICAgICAgICAgIHZhciBzcmMgPSAoYmVmb3JlTG9hZCAmJiBiZWZvcmVMb2FkKGltZ0VsZW0pKSB8fCBpbWdFbGVtW19HRVRfQVRUUklCVVRFX10oJ3NyYycpO1xuXG4gICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgIC8vIElmIG5vIGltYWdlIHNyYyBhdHRyaWJ1dGUgaXMgc2V0IGRvIG5vIGluamVjdGlvbi4gVGhpcyBjYW4gb25seSBiZSByZWFjaGVkIGJ5IHVzaW5nIGphdmFzY3JpcHRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaWYgbm8gc3JjIGF0dHJpYnV0ZSBpcyBzZXQgdGhlIG9ubG9hZCBhbmQgb25lcnJvciBldmVudHMgZG8gbm90IGdldCBjYWxsZWRcbiAgICAgICAgICAgIGlmIChzcmMgPT09ICcnKSB7XG4gICAgICAgICAgICAgIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBzZXQgYXJyYXkgc28gbGF0ZXIgY2FsbHMgY2FuIHJlZ2lzdGVyIGNhbGxiYWNrc1xuICAgICAgICAgIHZhciBvbkZpbmlzaENhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgIGltZ0VsZW1bX19TVkdJTkpFQ1RdID0gb25GaW5pc2hDYWxsYmFja3M7XG5cbiAgICAgICAgICB2YXIgb25GaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICBvbkZpbmlzaENhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKG9uRmluaXNoQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgb25GaW5pc2hDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHZhciBhYnNVcmwgPSBnZXRBYnNvbHV0ZVVybChzcmMpO1xuICAgICAgICAgIHZhciB1c2VDYWNoZU9wdGlvbiA9IG9wdGlvbnMudXNlQ2FjaGU7XG4gICAgICAgICAgdmFyIG1ha2VJZHNVbmlxdWVPcHRpb24gPSBvcHRpb25zLm1ha2VJZHNVbmlxdWU7XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIHNldFN2Z0xvYWRDYWNoZVZhbHVlID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FjaGVPcHRpb24pIHtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0uZm9yRWFjaChmdW5jdGlvbihzdmdMb2FkKSB7XG4gICAgICAgICAgICAgICAgc3ZnTG9hZCh2YWwpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0gPSB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmICh1c2VDYWNoZU9wdGlvbikge1xuICAgICAgICAgICAgdmFyIHN2Z0xvYWQgPSBzdmdMb2FkQ2FjaGVbYWJzVXJsXTtcblxuICAgICAgICAgICAgdmFyIGhhbmRsZUxvYWRWYWx1ZSA9IGZ1bmN0aW9uKGxvYWRWYWx1ZSkge1xuICAgICAgICAgICAgICBpZiAobG9hZFZhbHVlID09PSBMT0FEX0ZBSUwpIHtcbiAgICAgICAgICAgICAgICBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2FkVmFsdWUgPT09IFNWR19JTlZBTElEKSB7XG4gICAgICAgICAgICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzVW5pcXVlSWRzID0gbG9hZFZhbHVlWzBdO1xuICAgICAgICAgICAgICAgIHZhciBzdmdTdHJpbmcgPSBsb2FkVmFsdWVbMV07XG4gICAgICAgICAgICAgICAgdmFyIHVuaXF1ZUlkc1N2Z1N0cmluZyA9IGxvYWRWYWx1ZVsyXTtcbiAgICAgICAgICAgICAgICB2YXIgc3ZnRWxlbTtcblxuICAgICAgICAgICAgICAgIGlmIChtYWtlSWRzVW5pcXVlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaGFzVW5pcXVlSWRzID09PSBOVUxMKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElEcyBmb3IgdGhlIFNWRyBzdHJpbmcgaGF2ZSBub3QgYmVlbiBtYWRlIHVuaXF1ZSBiZWZvcmUuIFRoaXMgbWF5IGhhcHBlbiBpZiBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAvLyBpbmplY3Rpb24gb2YgYSBjYWNoZWQgU1ZHIGhhdmUgYmVlbiBydW4gd2l0aCB0aGUgb3B0aW9uIG1ha2VkSWRzVW5pcXVlIHNldCB0byBmYWxzZVxuICAgICAgICAgICAgICAgICAgICBzdmdFbGVtID0gYnVpbGRTdmdFbGVtZW50KHN2Z1N0cmluZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBoYXNVbmlxdWVJZHMgPSBtYWtlSWRzVW5pcXVlKHN2Z0VsZW0sIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgICAgICBsb2FkVmFsdWVbMF0gPSBoYXNVbmlxdWVJZHM7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRWYWx1ZVsyXSA9IGhhc1VuaXF1ZUlkcyAmJiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1VuaXF1ZUlkcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIElEcyB1bmlxdWUgZm9yIGFscmVhZHkgY2FjaGVkIFNWR3Mgd2l0aCBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgICAgICAgICAgc3ZnU3RyaW5nID0gbWFrZUlkc1VuaXF1ZUNhY2hlZCh1bmlxdWVJZHNTdmdTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN2Z0VsZW0gPSBzdmdFbGVtIHx8IGJ1aWxkU3ZnRWxlbWVudChzdmdTdHJpbmcsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGluamVjdChpbWdFbGVtLCBzdmdFbGVtLCBhYnNVcmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHN2Z0xvYWQgIT0gX1VOREVGSU5FRF8pIHtcbiAgICAgICAgICAgICAgLy8gVmFsdWUgZm9yIHVybCBleGlzdHMgaW4gY2FjaGVcbiAgICAgICAgICAgICAgaWYgKHN2Z0xvYWQuaXNDYWxsYmFja1F1ZXVlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2FtZSB1cmwgaGFzIGJlZW4gY2FjaGVkLCBidXQgdmFsdWUgaGFzIG5vdCBiZWVuIGxvYWRlZCB5ZXQsIHNvIGFkZCB0byBjYWxsYmFja3NcbiAgICAgICAgICAgICAgICBzdmdMb2FkLnB1c2goaGFuZGxlTG9hZFZhbHVlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVMb2FkVmFsdWUoc3ZnTG9hZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHN2Z0xvYWQgPSBbXTtcbiAgICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5IGlzQ2FsbGJhY2tRdWV1ZSB0byBBcnJheSB0byBkaWZmZXJlbnRpYXRlIGZyb20gYXJyYXkgd2l0aCBjYWNoZWQgbG9hZGVkIHZhbHVlc1xuICAgICAgICAgICAgICBzdmdMb2FkLmlzQ2FsbGJhY2tRdWV1ZSA9IHRydWU7XG4gICAgICAgICAgICAgIHN2Z0xvYWRDYWNoZVthYnNVcmxdID0gc3ZnTG9hZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBMb2FkIHRoZSBTVkcgYmVjYXVzZSBpdCBpcyBub3QgY2FjaGVkIG9yIGNhY2hpbmcgaXMgZGlzYWJsZWRcbiAgICAgICAgICBsb2FkU3ZnKGFic1VybCwgZnVuY3Rpb24oc3ZnWG1sLCBzdmdTdHJpbmcpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgWE1MIGZyb20gdGhlIFhIUiByZXF1ZXN0IGlmIGl0IGlzIGFuIGluc3RhbmNlIG9mIERvY3VtZW50LiBPdGhlcndpc2VcbiAgICAgICAgICAgIC8vIChmb3IgZXhhbXBsZSBvZiBJRTkpLCBjcmVhdGUgdGhlIHN2ZyBkb2N1bWVudCBmcm9tIHRoZSBzdmcgc3RyaW5nLlxuICAgICAgICAgICAgdmFyIHN2Z0VsZW0gPSBzdmdYbWwgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHN2Z1htbC5kb2N1bWVudEVsZW1lbnQgOiBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyaW5nLCB0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGFmdGVyTG9hZCA9IG9wdGlvbnMuYWZ0ZXJMb2FkO1xuICAgICAgICAgICAgaWYgKGFmdGVyTG9hZCkge1xuICAgICAgICAgICAgICAvLyBJbnZva2UgYWZ0ZXJMb2FkIGhvb2sgd2hpY2ggbWF5IG1vZGlmeSB0aGUgU1ZHIGVsZW1lbnQuIEFmdGVyIGxvYWQgbWF5IGFsc28gcmV0dXJuIGEgbmV3XG4gICAgICAgICAgICAgIC8vIHN2ZyBlbGVtZW50IG9yIHN2ZyBzdHJpbmdcbiAgICAgICAgICAgICAgdmFyIHN2Z0VsZW1PclN2Z1N0cmluZyA9IGFmdGVyTG9hZChzdmdFbGVtLCBzdmdTdHJpbmcpIHx8IHN2Z0VsZW07XG4gICAgICAgICAgICAgIGlmIChzdmdFbGVtT3JTdmdTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgc3ZnRWxlbSBhbmQgc3ZnU3RyaW5nIGJlY2F1c2Ugb2YgbW9kaWZpY2F0aW9ucyB0byB0aGUgU1ZHIGVsZW1lbnQgb3IgU1ZHIHN0cmluZyBpblxuICAgICAgICAgICAgICAgIC8vIHRoZSBhZnRlckxvYWQgaG9vaywgc28gdGhlIG1vZGlmaWVkIFNWRyBpcyBhbHNvIHVzZWQgZm9yIGFsbCBsYXRlciBjYWNoZWQgaW5qZWN0aW9uc1xuICAgICAgICAgICAgICAgIHZhciBpc1N0cmluZyA9IHR5cGVvZiBzdmdFbGVtT3JTdmdTdHJpbmcgPT0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgc3ZnU3RyaW5nID0gaXNTdHJpbmcgPyBzdmdFbGVtT3JTdmdTdHJpbmcgOiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgc3ZnRWxlbSA9IGlzU3RyaW5nID8gYnVpbGRTdmdFbGVtZW50KHN2Z0VsZW1PclN2Z1N0cmluZywgdHJ1ZSkgOiBzdmdFbGVtT3JTdmdTdHJpbmc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN2Z0VsZW0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgICAgICAgICAgIHZhciBoYXNVbmlxdWVJZHMgPSBOVUxMO1xuICAgICAgICAgICAgICBpZiAobWFrZUlkc1VuaXF1ZU9wdGlvbikge1xuICAgICAgICAgICAgICAgIGhhc1VuaXF1ZUlkcyA9IG1ha2VJZHNVbmlxdWUoc3ZnRWxlbSwgZmFsc2UpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHVzZUNhY2hlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVuaXF1ZUlkc1N2Z1N0cmluZyA9IGhhc1VuaXF1ZUlkcyAmJiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgLy8gc2V0IGFuIGFycmF5IHdpdGggdGhyZWUgZW50cmllcyB0byB0aGUgbG9hZCBjYWNoZVxuICAgICAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKFtoYXNVbmlxdWVJZHMsIHN2Z1N0cmluZywgdW5pcXVlSWRzU3ZnU3RyaW5nXSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSwgYWJzVXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKFNWR19JTlZBTElEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKExPQURfRkFJTCk7XG4gICAgICAgICAgICBvbkZpbmlzaCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlKSkge1xuICAgICAgICAgICAgLy8gc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUgaXMgYW4gYXJyYXkuIEluamVjdGlvbiBpcyBub3QgY29tcGxldGUgc28gcmVnaXN0ZXIgY2FsbGJhY2tcbiAgICAgICAgICAgIHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW1nTm90U2V0KCk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBkZWZhdWx0IFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIFNWR0luamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBkZWZhdWx0IFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIGFuIGluamVjdGlvbi5cbiAgICAgKi9cbiAgICBTVkdJbmplY3Quc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIGRlZmF1bHRPcHRpb25zID0gbWVyZ2VPcHRpb25zKGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKTtcbiAgICB9O1xuXG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgU1ZHSW5qZWN0XG4gICAgU1ZHSW5qZWN0LmNyZWF0ZSA9IGNyZWF0ZVNWR0luamVjdDtcblxuXG4gICAgLyoqXG4gICAgICogVXNlZCBpbiBvbmVycm9yIEV2ZW50IG9mIGFuIGA8aW1nPmAgZWxlbWVudCB0byBoYW5kbGUgY2FzZXMgd2hlbiB0aGUgbG9hZGluZyB0aGUgb3JpZ2luYWwgc3JjIGZhaWxzXG4gICAgICogKGZvciBleGFtcGxlIGlmIGZpbGUgaXMgbm90IGZvdW5kIG9yIGlmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgU1ZHKS4gVGhpcyB0cmlnZ2VycyBhIGNhbGwgdG8gdGhlXG4gICAgICogb3B0aW9ucyBvbkZhaWwgaG9vayBpZiBhdmFpbGFibGUuIFRoZSBvcHRpb25hbCBzZWNvbmQgcGFyYW1ldGVyIHdpbGwgYmUgc2V0IGFzIHRoZSBuZXcgc3JjIGF0dHJpYnV0ZVxuICAgICAqIGZvciB0aGUgaW1nIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxJbWFnZUVsZW1lbnR9IGltZyAtIGFuIGltZyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtmYWxsYmFja1NyY10gLSBvcHRpb25hbCBwYXJhbWV0ZXIgZmFsbGJhY2sgc3JjXG4gICAgICovXG4gICAgU1ZHSW5qZWN0LmVyciA9IGZ1bmN0aW9uKGltZywgZmFsbGJhY2tTcmMpIHtcbiAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgaWYgKGltZ1tfX1NWR0lOSkVDVF0gIT0gRkFJTCkge1xuICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZyk7XG5cbiAgICAgICAgICBpZiAoIUlTX1NWR19TVVBQT1JURUQpIHtcbiAgICAgICAgICAgIHN2Z05vdFN1cHBvcnRlZChpbWcsIGRlZmF1bHRPcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZyk7XG4gICAgICAgICAgICBsb2FkRmFpbChpbWcsIGRlZmF1bHRPcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZhbGxiYWNrU3JjKSB7XG4gICAgICAgICAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nKTtcbiAgICAgICAgICAgIGltZy5zcmMgPSBmYWxsYmFja1NyYztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGltZ05vdFNldCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3dbZ2xvYmFsTmFtZV0gPSBTVkdJbmplY3Q7XG5cbiAgICByZXR1cm4gU1ZHSW5qZWN0O1xuICB9XG5cbiAgdmFyIFNWR0luamVjdEluc3RhbmNlID0gY3JlYXRlU1ZHSW5qZWN0KCdTVkdJbmplY3QnKTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNWR0luamVjdEluc3RhbmNlO1xuICB9XG59KSh3aW5kb3csIGRvY3VtZW50KTsiLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvZ2V0VXJsLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18gPSBuZXcgVVJMKFwiLi9hc3NldHMvZm9udHMvUm9ib3RvX0NvbmRlbnNlZC9zdGF0aWMvUm9ib3RvQ29uZGVuc2VkLU1lZGl1bS50dGZcIiwgaW1wb3J0Lm1ldGEudXJsKTtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19fID0gX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYEBmb250LWZhY2Uge1xuICAvKiBodHRwczovL2ZvbnRzLmdvb2dsZS5jb20vc3BlY2ltZW4vUm9ib3RvK0NvbmRlbnNlZCAqL1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xuICBzcmM6IHVybCgke19fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX199KTtcbiAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xufVxuXG4qLFxuKjo6YmVmb3JlLFxuKjo6YWZ0ZXIge1xuICBwYWRkaW5nOiAwO1xuICBtYXJnaW46IDA7XG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gIGZvbnQtc2l6ZTogMTZweDtcbn1cblxuYm9keSB7XG4gIG1pbi1oZWlnaHQ6IDEwMHN2aDtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE0OSwgMTE2LCA1OSk7XG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCcsIEFyaWFsO1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xuICBmb250LWZhbWlseTogQXJpYWw7XG59XG5cbiNiYXR0bGVzaGlwX2FwcCB7XG4gIG1pbi1oZWlnaHQ6IGluaGVyaXQ7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtcm93czogbWluLWNvbnRlbnQgMWZyO1xufVxuXG4jbWFpbl9jb250ZW50IHtcbiAgLyogVGVtcG9yYXJ5ICovXG4gIC8qIG1hcmdpbi10b3A6IDRlbTsgKi9cbn1cblxuI21haW5fY29udGVudCA+IDpmaXJzdC1jaGlsZCB7XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9hcHAuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsdURBQXVEO0VBQ3ZELCtCQUErQjtFQUMvQiw0Q0FBMkU7RUFDM0UsZ0JBQWdCO0VBQ2hCLGtCQUFrQjtBQUNwQjs7QUFFQTs7O0VBR0UsVUFBVTtFQUNWLFNBQVM7RUFDVCxzQkFBc0I7RUFDdEIsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixtQ0FBbUM7RUFDbkMsc0NBQXNDO0VBQ3RDLCtCQUErQjtFQUMvQixrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxtQkFBbUI7RUFDbkIsYUFBYTtFQUNiLG1DQUFtQztBQUNyQzs7QUFFQTtFQUNFLGNBQWM7RUFDZCxxQkFBcUI7QUFDdkI7O0FBRUE7RUFDRSxZQUFZO0VBQ1osYUFBYTtFQUNiLHVCQUF1QjtBQUN6QlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCJAZm9udC1mYWNlIHtcXG4gIC8qIGh0dHBzOi8vZm9udHMuZ29vZ2xlLmNvbS9zcGVjaW1lbi9Sb2JvdG8rQ29uZGVuc2VkICovXFxuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xcbiAgc3JjOiB1cmwoLi9hc3NldHMvZm9udHMvUm9ib3RvX0NvbmRlbnNlZC9zdGF0aWMvUm9ib3RvQ29uZGVuc2VkLU1lZGl1bS50dGYpO1xcbiAgZm9udC13ZWlnaHQ6IDYwMDtcXG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcXG59XFxuXFxuKixcXG4qOjpiZWZvcmUsXFxuKjo6YWZ0ZXIge1xcbiAgcGFkZGluZzogMDtcXG4gIG1hcmdpbjogMDtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBmb250LXNpemU6IDE2cHg7XFxufVxcblxcbmJvZHkge1xcbiAgbWluLWhlaWdodDogMTAwc3ZoO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE0OSwgMTE2LCA1OSk7XFxuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnLCBBcmlhbDtcXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XFxuICBmb250LWZhbWlseTogQXJpYWw7XFxufVxcblxcbiNiYXR0bGVzaGlwX2FwcCB7XFxuICBtaW4taGVpZ2h0OiBpbmhlcml0O1xcbiAgZGlzcGxheTogZ3JpZDtcXG4gIGdyaWQtdGVtcGxhdGUtcm93czogbWluLWNvbnRlbnQgMWZyO1xcbn1cXG5cXG4jbWFpbl9jb250ZW50IHtcXG4gIC8qIFRlbXBvcmFyeSAqL1xcbiAgLyogbWFyZ2luLXRvcDogNGVtOyAqL1xcbn1cXG5cXG4jbWFpbl9jb250ZW50ID4gOmZpcnN0LWNoaWxkIHtcXG4gIGhlaWdodDogMTAwJTtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjaGVhZGVyIHtcbiAgcGFkZGluZzogMWVtIDJlbSA0ZW07XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYigxNjUsIDE2NSwgMTY1KTtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9oZWFkZXIuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0Usb0JBQW9CO0VBQ3BCLG9DQUFvQztBQUN0Q1wiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjaGVhZGVyIHtcXG4gIHBhZGRpbmc6IDFlbSAyZW0gNGVtO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE2NSwgMTY1LCAxNjUpO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNob21lIHtcbn1cblxuLmdhbWVtb2RlX2J0bnMge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgZ2FwOiAyZW07XG59XG5cbi5nYW1lbW9kZV9idG5zID4gKiB7XG4gIHBhZGRpbmc6IDJlbTtcbn1cblxuLmdhbWVtb2RlX2J0bnMgPiAqID4gc3BhbiB7XG4gIGZvbnQtc2l6ZTogMmVtO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL2hvbWUuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0FBQ0E7O0FBRUE7RUFDRSxhQUFhO0VBQ2Isc0JBQXNCO0VBQ3RCLHVCQUF1QjtFQUN2QixRQUFRO0FBQ1Y7O0FBRUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxjQUFjO0FBQ2hCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNob21lIHtcXG59XFxuXFxuLmdhbWVtb2RlX2J0bnMge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG4gIGdhcDogMmVtO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICoge1xcbiAgcGFkZGluZzogMmVtO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICogPiBzcGFuIHtcXG4gIGZvbnQtc2l6ZTogMmVtO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNuYXZiYXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG59XG5cbiNuYXZiYXIgPiAqIHtcbiAgZGlzcGxheTogZmxleDtcbiAgbGlzdC1zdHlsZTogbm9uZTtcbn1cblxuLm5hdl9yaWdodCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbn1cblxuLm5hdl9yaWdodCA+IDpsYXN0LWNoaWxkIHtcbiAgLyogRXhwZXJpbWVudGluZyAqL1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHJpZ2h0OiAwO1xuICB0b3A6IDFlbTtcbiAgcGFkZGluZzogMXJlbTtcbn1cblxuLm5hdl9pdGVtLm5hdl9sb2dvIHtcbiAgZGlzcGxheTogZmxleDtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9uYXZiYXIuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtFQUNiLDhCQUE4QjtBQUNoQzs7QUFFQTtFQUNFLGFBQWE7RUFDYixnQkFBZ0I7QUFDbEI7O0FBRUE7RUFDRSxrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsa0JBQWtCO0VBQ2xCLFFBQVE7RUFDUixRQUFRO0VBQ1IsYUFBYTtBQUNmOztBQUVBO0VBQ0UsYUFBYTtBQUNmXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNuYXZiYXIge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG59XFxuXFxuI25hdmJhciA+ICoge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGxpc3Qtc3R5bGU6IG5vbmU7XFxufVxcblxcbi5uYXZfcmlnaHQge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG5cXG4ubmF2X3JpZ2h0ID4gOmxhc3QtY2hpbGQge1xcbiAgLyogRXhwZXJpbWVudGluZyAqL1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgcmlnaHQ6IDA7XFxuICB0b3A6IDFlbTtcXG4gIHBhZGRpbmc6IDFyZW07XFxufVxcblxcbi5uYXZfaXRlbS5uYXZfbG9nbyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYC5ub3RpZmljYXRpb25zX2NvbnRhaW5lciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtFQUNiLHVCQUF1QjtBQUN6QlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIubm90aWZpY2F0aW9uc19jb250YWluZXIge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYC5wb3J0X2xpbmVzIHtcbiAgZGlzcGxheTogZmxleDtcbn1cblxuLnBvcnRfc2hpcCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgYm9yZGVyOiAxcHggZG90dGVkICNiMmIyYjk7XG4gIG1hcmdpbjogMC41ZW07XG4gIC8qIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAqL1xufVxuXG4uc2hpcF9ib3gge1xuICB6LWluZGV4OiAyO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMjU1LCAwLjA1KTtcbiAgYm9yZGVyOiAycHggc29saWQgIzAwZjtcbiAgbGVmdDogMDtcbiAgdG9wOiAwO1xuICAvKiBib3gtc2l6aW5nOiBjb250ZW50LWJveDsgKi9cbn1cblxuLnNoaXBfYm94OmhvdmVyIHtcbiAgY3Vyc29yOiBtb3ZlO1xufVxuXG4uY2VsbF9jb250ZW50ID4gLnNoaXBfYm94IHtcbiAgLyogQ29tbWVudCBvdXQgaWYgdXNpbmcgYm94LXNpemluZzogY29udGVudCAqL1xuICBsZWZ0OiAtNCU7XG4gIHRvcDogLTQlO1xufVxuXG4uc2hpcF9ib3guZHJhZ2dpbmcuc2hpcF9ib3hfdHJhbnNwYXJlbnQge1xuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgYm9yZGVyOiB0cmFuc3BhcmVudDtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9wb3J0LmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQiwwQkFBMEI7RUFDMUIsYUFBYTtFQUNiLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFLFVBQVU7RUFDVixrQkFBa0I7RUFDbEIsaUNBQWlDO0VBQ2pDLHNCQUFzQjtFQUN0QixPQUFPO0VBQ1AsTUFBTTtFQUNOLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLDZDQUE2QztFQUM3QyxTQUFTO0VBQ1QsUUFBUTtBQUNWOztBQUVBO0VBQ0UsdUJBQXVCO0VBQ3ZCLG1CQUFtQjtBQUNyQlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIucG9ydF9saW5lcyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cXG4ucG9ydF9zaGlwIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGJvcmRlcjogMXB4IGRvdHRlZCAjYjJiMmI5O1xcbiAgbWFyZ2luOiAwLjVlbTtcXG4gIC8qIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAqL1xcbn1cXG5cXG4uc2hpcF9ib3gge1xcbiAgei1pbmRleDogMjtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMjU1LCAwLjA1KTtcXG4gIGJvcmRlcjogMnB4IHNvbGlkICMwMGY7XFxuICBsZWZ0OiAwO1xcbiAgdG9wOiAwO1xcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXFxufVxcblxcbi5zaGlwX2JveDpob3ZlciB7XFxuICBjdXJzb3I6IG1vdmU7XFxufVxcblxcbi5jZWxsX2NvbnRlbnQgPiAuc2hpcF9ib3gge1xcbiAgLyogQ29tbWVudCBvdXQgaWYgdXNpbmcgYm94LXNpemluZzogY29udGVudCAqL1xcbiAgbGVmdDogLTQlO1xcbiAgdG9wOiAtNCU7XFxufVxcblxcbi5zaGlwX2JveC5kcmFnZ2luZy5zaGlwX2JveF90cmFuc3BhcmVudCB7XFxuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcXG4gIGJvcmRlcjogdHJhbnNwYXJlbnQ7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgI2JvYXJkX2NvbnRhaW5lciB7XG4gIG1hcmdpbi10b3A6IDRlbTtcbiAgZGlzcGxheTogZmxleDtcbiAgZ2FwOiA4cmVtO1xuICB1c2VyLXNlbGVjdDogbm9uZTtcbn1cblxuI2JvYXJkX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqIHtcbiAgZGlzcGxheTogZmxleDtcbn1cblxuI2JvYXJkX2NvbnRhaW5lciA+ICoud2FpdCA+ICo6bm90KC5nYW1lX3N0YXJ0KSB7XG4gIG9wYWNpdHk6IDAuNDtcbn1cblxuI2JvYXJkX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gYnV0dG9uIHtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBib3JkZXI6IG5vbmU7XG59XG5cbiNib2FyZF9jb250YWluZXIgPiAqOm5vdCgud2FpdCkgPiAqID4gKiA+IC5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XG59XG5cbi5wbGF5ZXJfb25lLFxuLnBsYXllcl90d28ge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIHdpZHRoOiBtaW4tY29udGVudDtcbn1cblxuLnBsYXllcl90d28gPiAuZ2FtZV9zdGFydCB7XG4gIGRpc3BsYXk6IG5vbmU7XG59XG5cbi5wbGF5ZXJfdHdvLndhaXQgPiAuZ2FtZV9zdGFydCB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHRvcDogMjAlO1xufVxuXG4uZ2FtZV9zdGFydCA+IGJ1dHRvbiB7XG4gIGZvbnQtc2l6ZTogNHJlbTtcbn1cblxuLmNlbGwgPiAqIHtcbiAgd2lkdGg6IDJlbTtcbiAgaGVpZ2h0OiAyZW07XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XG4gIC8qIHBvaW50ZXItZXZlbnRzOiBub25lOyAqL1xuICBib3JkZXI6IDFweCBzb2xpZCBibGFjaztcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXG59XG5cbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcbiAgLypcbiAgU2hvdyBzaGlwIGR1cmluZyBwbGFjaW5nIHNoaXBzIHBoYXNlXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxuICAqL1xuICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgaGVpZ2h0OiBpbmhlcml0O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiBjb3JuZmxvd2VyYmx1ZTtcbn1cblxuLyogI2JvYXJkX2NvbnRhaW5lciA+ICo6bm90KC53YWl0KSA+IC5ib2FyZCA+IC5ib2FyZF9yb3cgPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAsICovXG4jYm9hcmRfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XG59XG5cbiNib2FyZF9jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogZ3JleTtcbn1cblxuLmNlbGxfY29udGVudCA+IC5yb3dfbWFya2VyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBoZWlnaHQ6IDEwMCU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGxlZnQ6IC0yZW07XG4gIHRvcDogMDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgei1pbmRleDogLTE7XG59XG5cbi5jZWxsX2NvbnRlbnQgPiAuY29sX21hcmtlciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAtMmVtO1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHdpZHRoOiAxMDAlO1xuICB6LWluZGV4OiAtMTtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGVBQWU7RUFDZixhQUFhO0VBQ2IsU0FBUztFQUNULGlCQUFpQjtBQUNuQjs7QUFFQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLGVBQWU7RUFDZixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSw2QkFBNkI7QUFDL0I7O0FBRUE7O0VBRUUsa0JBQWtCO0VBQ2xCLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLGNBQWM7RUFDZCxrQkFBa0I7RUFDbEIsUUFBUTtBQUNWOztBQUVBO0VBQ0UsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLFVBQVU7RUFDVixXQUFXO0VBQ1gsa0JBQWtCO0VBQ2xCLHVCQUF1QjtFQUN2QiwwQkFBMEI7RUFDMUIsdUJBQXVCO0VBQ3ZCLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFOzs7R0FHQztFQUNELG9CQUFvQjtFQUNwQixlQUFlO0VBQ2YsZ0NBQWdDO0FBQ2xDOztBQUVBLCtGQUErRjtBQUMvRjtFQUNFLHFCQUFxQjtBQUN2Qjs7QUFFQTtFQUNFLHNCQUFzQjtBQUN4Qjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixZQUFZO0VBQ1osYUFBYTtFQUNiLFVBQVU7RUFDVixNQUFNO0VBQ04sbUJBQW1CO0VBQ25CLFdBQVc7QUFDYjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixTQUFTO0VBQ1Qsa0JBQWtCO0VBQ2xCLFdBQVc7RUFDWCxXQUFXO0FBQ2JcIixcInNvdXJjZXNDb250ZW50XCI6W1wiI2JvYXJkX2NvbnRhaW5lciB7XFxuICBtYXJnaW4tdG9wOiA0ZW07XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZ2FwOiA4cmVtO1xcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XFxufVxcblxcbiNib2FyZF9jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cXG4jYm9hcmRfY29udGFpbmVyID4gKi53YWl0ID4gKjpub3QoLmdhbWVfc3RhcnQpIHtcXG4gIG9wYWNpdHk6IDAuNDtcXG59XFxuXFxuI2JvYXJkX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gYnV0dG9uIHtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIGJvcmRlcjogbm9uZTtcXG59XFxuXFxuI2JvYXJkX2NvbnRhaW5lciA+ICo6bm90KC53YWl0KSA+ICogPiAqID4gLmNlbGwgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcblxcbi5wbGF5ZXJfb25lLFxcbi5wbGF5ZXJfdHdvIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHdpZHRoOiBtaW4tY29udGVudDtcXG59XFxuXFxuLnBsYXllcl90d28gPiAuZ2FtZV9zdGFydCB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG5cXG4ucGxheWVyX3R3by53YWl0ID4gLmdhbWVfc3RhcnQge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDIwJTtcXG59XFxuXFxuLmdhbWVfc3RhcnQgPiBidXR0b24ge1xcbiAgZm9udC1zaXplOiA0cmVtO1xcbn1cXG5cXG4uY2VsbCA+ICoge1xcbiAgd2lkdGg6IDJlbTtcXG4gIGhlaWdodDogMmVtO1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxuICAvKiBwb2ludGVyLWV2ZW50czogbm9uZTsgKi9cXG4gIGJvcmRlcjogMXB4IHNvbGlkIGJsYWNrO1xcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXFxufVxcblxcbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcXG4gIC8qXFxuICBTaG93IHNoaXAgZHVyaW5nIHBsYWNpbmcgc2hpcHMgcGhhc2VcXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxcbiAgKi9cXG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbiAgaGVpZ2h0OiBpbmhlcml0O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogY29ybmZsb3dlcmJsdWU7XFxufVxcblxcbi8qICNib2FyZF9jb250YWluZXIgPiAqOm5vdCgud2FpdCkgPiAuYm9hcmQgPiAuYm9hcmRfcm93ID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwLCAqL1xcbiNib2FyZF9jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XFxufVxcblxcbiNib2FyZF9jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50IHtcXG4gIGJhY2tncm91bmQtY29sb3I6IGdyZXk7XFxufVxcblxcbi5jZWxsX2NvbnRlbnQgPiAucm93X21hcmtlciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBoZWlnaHQ6IDEwMCU7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgbGVmdDogLTJlbTtcXG4gIHRvcDogMDtcXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICB6LWluZGV4OiAtMTtcXG59XFxuXFxuLmNlbGxfY29udGVudCA+IC5jb2xfbWFya2VyIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogLTJlbTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgei1pbmRleDogLTE7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAgTUlUIExpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAgQXV0aG9yIFRvYmlhcyBLb3BwZXJzIEBzb2tyYVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcpIHtcbiAgdmFyIGxpc3QgPSBbXTtcblxuICAvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG4gIGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHZhciBjb250ZW50ID0gXCJcIjtcbiAgICAgIHZhciBuZWVkTGF5ZXIgPSB0eXBlb2YgaXRlbVs1XSAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICAgIGlmIChpdGVtWzRdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbWVkaWEgXCIuY29uY2F0KGl0ZW1bMl0sIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbGF5ZXJcIi5jb25jYXQoaXRlbVs1XS5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KGl0ZW1bNV0pIDogXCJcIiwgXCIge1wiKTtcbiAgICAgIH1cbiAgICAgIGNvbnRlbnQgKz0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtKTtcbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSkuam9pbihcIlwiKTtcbiAgfTtcblxuICAvLyBpbXBvcnQgYSBsaXN0IG9mIG1vZHVsZXMgaW50byB0aGUgbGlzdFxuICBsaXN0LmkgPSBmdW5jdGlvbiBpKG1vZHVsZXMsIG1lZGlhLCBkZWR1cGUsIHN1cHBvcnRzLCBsYXllcikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbW9kdWxlcyA9IFtbbnVsbCwgbW9kdWxlcywgdW5kZWZpbmVkXV07XG4gICAgfVxuICAgIHZhciBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzID0ge307XG4gICAgaWYgKGRlZHVwZSkge1xuICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXNba11bMF07XG4gICAgICAgIGlmIChpZCAhPSBudWxsKSB7XG4gICAgICAgICAgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpZF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIF9rID0gMDsgX2sgPCBtb2R1bGVzLmxlbmd0aDsgX2srKykge1xuICAgICAgdmFyIGl0ZW0gPSBbXS5jb25jYXQobW9kdWxlc1tfa10pO1xuICAgICAgaWYgKGRlZHVwZSAmJiBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBsYXllciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBpZiAodHlwZW9mIGl0ZW1bNV0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChtZWRpYSkge1xuICAgICAgICBpZiAoIWl0ZW1bMl0pIHtcbiAgICAgICAgICBpdGVtWzJdID0gbWVkaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3VwcG9ydHMpIHtcbiAgICAgICAgaWYgKCFpdGVtWzRdKSB7XG4gICAgICAgICAgaXRlbVs0XSA9IFwiXCIuY29uY2F0KHN1cHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNF0gPSBzdXBwb3J0cztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGlzdC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGxpc3Q7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIGlmICghdXJsKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICB1cmwgPSBTdHJpbmcodXJsLl9fZXNNb2R1bGUgPyB1cmwuZGVmYXVsdCA6IHVybCk7XG5cbiAgLy8gSWYgdXJsIGlzIGFscmVhZHkgd3JhcHBlZCBpbiBxdW90ZXMsIHJlbW92ZSB0aGVtXG4gIGlmICgvXlsnXCJdLipbJ1wiXSQvLnRlc3QodXJsKSkge1xuICAgIHVybCA9IHVybC5zbGljZSgxLCAtMSk7XG4gIH1cbiAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgIHVybCArPSBvcHRpb25zLmhhc2g7XG4gIH1cblxuICAvLyBTaG91bGQgdXJsIGJlIHdyYXBwZWQ/XG4gIC8vIFNlZSBodHRwczovL2RyYWZ0cy5jc3N3Zy5vcmcvY3NzLXZhbHVlcy0zLyN1cmxzXG4gIGlmICgvW1wiJygpIFxcdFxcbl18KCUyMCkvLnRlc3QodXJsKSB8fCBvcHRpb25zLm5lZWRRdW90ZXMpIHtcbiAgICByZXR1cm4gXCJcXFwiXCIuY29uY2F0KHVybC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIiksIFwiXFxcIlwiKTtcbiAgfVxuICByZXR1cm4gdXJsO1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXRlbSkge1xuICB2YXIgY29udGVudCA9IGl0ZW1bMV07XG4gIHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcbiAgaWYgKCFjc3NNYXBwaW5nKSB7XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH1cbiAgaWYgKHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoY3NzTWFwcGluZykpKSk7XG4gICAgdmFyIGRhdGEgPSBcInNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LFwiLmNvbmNhdChiYXNlNjQpO1xuICAgIHZhciBzb3VyY2VNYXBwaW5nID0gXCIvKiMgXCIuY29uY2F0KGRhdGEsIFwiICovXCIpO1xuICAgIHJldHVybiBbY29udGVudF0uY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbihcIlxcblwiKTtcbiAgfVxuICByZXR1cm4gW2NvbnRlbnRdLmpvaW4oXCJcXG5cIik7XG59OyIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9hcHAuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9hcHAuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2hlYWRlci5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2hlYWRlci5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaG9tZS5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2hvbWUuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25hdmJhci5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25hdmJhci5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vbm90aWZpY2F0aW9ucy5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25vdGlmaWNhdGlvbnMuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3BvcnQuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9wb3J0LmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9zY3JlZW5Db250cm9sbGVyLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vc2NyZWVuQ29udHJvbGxlci5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHN0eWxlc0luRE9NID0gW107XG5mdW5jdGlvbiBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKSB7XG4gIHZhciByZXN1bHQgPSAtMTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHlsZXNJbkRPTS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzdHlsZXNJbkRPTVtpXS5pZGVudGlmaWVyID09PSBpZGVudGlmaWVyKSB7XG4gICAgICByZXN1bHQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5mdW5jdGlvbiBtb2R1bGVzVG9Eb20obGlzdCwgb3B0aW9ucykge1xuICB2YXIgaWRDb3VudE1hcCA9IHt9O1xuICB2YXIgaWRlbnRpZmllcnMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldO1xuICAgIHZhciBpZCA9IG9wdGlvbnMuYmFzZSA/IGl0ZW1bMF0gKyBvcHRpb25zLmJhc2UgOiBpdGVtWzBdO1xuICAgIHZhciBjb3VudCA9IGlkQ291bnRNYXBbaWRdIHx8IDA7XG4gICAgdmFyIGlkZW50aWZpZXIgPSBcIlwiLmNvbmNhdChpZCwgXCIgXCIpLmNvbmNhdChjb3VudCk7XG4gICAgaWRDb3VudE1hcFtpZF0gPSBjb3VudCArIDE7XG4gICAgdmFyIGluZGV4QnlJZGVudGlmaWVyID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgdmFyIG9iaiA9IHtcbiAgICAgIGNzczogaXRlbVsxXSxcbiAgICAgIG1lZGlhOiBpdGVtWzJdLFxuICAgICAgc291cmNlTWFwOiBpdGVtWzNdLFxuICAgICAgc3VwcG9ydHM6IGl0ZW1bNF0sXG4gICAgICBsYXllcjogaXRlbVs1XVxuICAgIH07XG4gICAgaWYgKGluZGV4QnlJZGVudGlmaWVyICE9PSAtMSkge1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhCeUlkZW50aWZpZXJdLnJlZmVyZW5jZXMrKztcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS51cGRhdGVyKG9iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB1cGRhdGVyID0gYWRkRWxlbWVudFN0eWxlKG9iaiwgb3B0aW9ucyk7XG4gICAgICBvcHRpb25zLmJ5SW5kZXggPSBpO1xuICAgICAgc3R5bGVzSW5ET00uc3BsaWNlKGksIDAsIHtcbiAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcbiAgICAgICAgdXBkYXRlcjogdXBkYXRlcixcbiAgICAgICAgcmVmZXJlbmNlczogMVxuICAgICAgfSk7XG4gICAgfVxuICAgIGlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH1cbiAgcmV0dXJuIGlkZW50aWZpZXJzO1xufVxuZnVuY3Rpb24gYWRkRWxlbWVudFN0eWxlKG9iaiwgb3B0aW9ucykge1xuICB2YXIgYXBpID0gb3B0aW9ucy5kb21BUEkob3B0aW9ucyk7XG4gIGFwaS51cGRhdGUob2JqKTtcbiAgdmFyIHVwZGF0ZXIgPSBmdW5jdGlvbiB1cGRhdGVyKG5ld09iaikge1xuICAgIGlmIChuZXdPYmopIHtcbiAgICAgIGlmIChuZXdPYmouY3NzID09PSBvYmouY3NzICYmIG5ld09iai5tZWRpYSA9PT0gb2JqLm1lZGlhICYmIG5ld09iai5zb3VyY2VNYXAgPT09IG9iai5zb3VyY2VNYXAgJiYgbmV3T2JqLnN1cHBvcnRzID09PSBvYmouc3VwcG9ydHMgJiYgbmV3T2JqLmxheWVyID09PSBvYmoubGF5ZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXBpLnVwZGF0ZShvYmogPSBuZXdPYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcGkucmVtb3ZlKCk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gdXBkYXRlcjtcbn1cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGxpc3QsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGxpc3QgPSBsaXN0IHx8IFtdO1xuICB2YXIgbGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gZnVuY3Rpb24gdXBkYXRlKG5ld0xpc3QpIHtcbiAgICBuZXdMaXN0ID0gbmV3TGlzdCB8fCBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGlkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbaV07XG4gICAgICB2YXIgaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4XS5yZWZlcmVuY2VzLS07XG4gICAgfVxuICAgIHZhciBuZXdMYXN0SWRlbnRpZmllcnMgPSBtb2R1bGVzVG9Eb20obmV3TGlzdCwgb3B0aW9ucyk7XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IF9pKyspIHtcbiAgICAgIHZhciBfaWRlbnRpZmllciA9IGxhc3RJZGVudGlmaWVyc1tfaV07XG4gICAgICB2YXIgX2luZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoX2lkZW50aWZpZXIpO1xuICAgICAgaWYgKHN0eWxlc0luRE9NW19pbmRleF0ucmVmZXJlbmNlcyA9PT0gMCkge1xuICAgICAgICBzdHlsZXNJbkRPTVtfaW5kZXhdLnVwZGF0ZXIoKTtcbiAgICAgICAgc3R5bGVzSW5ET00uc3BsaWNlKF9pbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuICAgIGxhc3RJZGVudGlmaWVycyA9IG5ld0xhc3RJZGVudGlmaWVycztcbiAgfTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBtZW1vID0ge307XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gZ2V0VGFyZ2V0KHRhcmdldCkge1xuICBpZiAodHlwZW9mIG1lbW9bdGFyZ2V0XSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBzdHlsZVRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KTtcblxuICAgIC8vIFNwZWNpYWwgY2FzZSB0byByZXR1cm4gaGVhZCBvZiBpZnJhbWUgaW5zdGVhZCBvZiBpZnJhbWUgaXRzZWxmXG4gICAgaWYgKHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCAmJiBzdHlsZVRhcmdldCBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVGhpcyB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBhY2Nlc3MgdG8gaWZyYW1lIGlzIGJsb2NrZWRcbiAgICAgICAgLy8gZHVlIHRvIGNyb3NzLW9yaWdpbiByZXN0cmljdGlvbnNcbiAgICAgICAgc3R5bGVUYXJnZXQgPSBzdHlsZVRhcmdldC5jb250ZW50RG9jdW1lbnQuaGVhZDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gaXN0YW5idWwgaWdub3JlIG5leHRcbiAgICAgICAgc3R5bGVUYXJnZXQgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBtZW1vW3RhcmdldF0gPSBzdHlsZVRhcmdldDtcbiAgfVxuICByZXR1cm4gbWVtb1t0YXJnZXRdO1xufVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGluc2VydEJ5U2VsZWN0b3IoaW5zZXJ0LCBzdHlsZSkge1xuICB2YXIgdGFyZ2V0ID0gZ2V0VGFyZ2V0KGluc2VydCk7XG4gIGlmICghdGFyZ2V0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnQnIHBhcmFtZXRlciBpcyBpbnZhbGlkLlwiKTtcbiAgfVxuICB0YXJnZXQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xufVxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRCeVNlbGVjdG9yOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICBvcHRpb25zLnNldEF0dHJpYnV0ZXMoZWxlbWVudCwgb3B0aW9ucy5hdHRyaWJ1dGVzKTtcbiAgb3B0aW9ucy5pbnNlcnQoZWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGluc2VydFN0eWxlRWxlbWVudDsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMoc3R5bGVFbGVtZW50KSB7XG4gIHZhciBub25jZSA9IHR5cGVvZiBfX3dlYnBhY2tfbm9uY2VfXyAhPT0gXCJ1bmRlZmluZWRcIiA/IF9fd2VicGFja19ub25jZV9fIDogbnVsbDtcbiAgaWYgKG5vbmNlKSB7XG4gICAgc3R5bGVFbGVtZW50LnNldEF0dHJpYnV0ZShcIm5vbmNlXCIsIG5vbmNlKTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBzZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gYXBwbHkoc3R5bGVFbGVtZW50LCBvcHRpb25zLCBvYmopIHtcbiAgdmFyIGNzcyA9IFwiXCI7XG4gIGlmIChvYmouc3VwcG9ydHMpIHtcbiAgICBjc3MgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChvYmouc3VwcG9ydHMsIFwiKSB7XCIpO1xuICB9XG4gIGlmIChvYmoubWVkaWEpIHtcbiAgICBjc3MgKz0gXCJAbWVkaWEgXCIuY29uY2F0KG9iai5tZWRpYSwgXCIge1wiKTtcbiAgfVxuICB2YXIgbmVlZExheWVyID0gdHlwZW9mIG9iai5sYXllciAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgaWYgKG5lZWRMYXllcikge1xuICAgIGNzcyArPSBcIkBsYXllclwiLmNvbmNhdChvYmoubGF5ZXIubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChvYmoubGF5ZXIpIDogXCJcIiwgXCIge1wiKTtcbiAgfVxuICBjc3MgKz0gb2JqLmNzcztcbiAgaWYgKG5lZWRMYXllcikge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG4gIGlmIChvYmouc3VwcG9ydHMpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cbiAgdmFyIHNvdXJjZU1hcCA9IG9iai5zb3VyY2VNYXA7XG4gIGlmIChzb3VyY2VNYXAgJiYgdHlwZW9mIGJ0b2EgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBjc3MgKz0gXCJcXG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LFwiLmNvbmNhdChidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShzb3VyY2VNYXApKSkpLCBcIiAqL1wiKTtcbiAgfVxuXG4gIC8vIEZvciBvbGQgSUVcbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICAqL1xuICBvcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtKGNzcywgc3R5bGVFbGVtZW50LCBvcHRpb25zLm9wdGlvbnMpO1xufVxuZnVuY3Rpb24gcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCkge1xuICAvLyBpc3RhbmJ1bCBpZ25vcmUgaWZcbiAgaWYgKHN0eWxlRWxlbWVudC5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHN0eWxlRWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudCk7XG59XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gZG9tQVBJKG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHJldHVybiB7XG4gICAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZSgpIHt9LFxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7fVxuICAgIH07XG4gIH1cbiAgdmFyIHN0eWxlRWxlbWVudCA9IG9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMpO1xuICByZXR1cm4ge1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKG9iaikge1xuICAgICAgYXBwbHkoc3R5bGVFbGVtZW50LCBvcHRpb25zLCBvYmopO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7XG4gICAgICByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KTtcbiAgICB9XG4gIH07XG59XG5tb2R1bGUuZXhwb3J0cyA9IGRvbUFQSTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCkge1xuICBpZiAoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICB9IGVsc2Uge1xuICAgIHdoaWxlIChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgc3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgc3R5bGVFbGVtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICB9XG59XG5tb2R1bGUuZXhwb3J0cyA9IHN0eWxlVGFnVHJhbnNmb3JtOyIsImltcG9ydCAnQGljb25mdS9zdmctaW5qZWN0JztcbmltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBidWlsZEhlYWRlciBmcm9tICcuL2NvbXBvbmVudHMvaGVhZGVyL2hlYWRlcic7XG5pbXBvcnQgYnVpbGRNYWluIGZyb20gJy4vY29tcG9uZW50cy9tYWluL21haW4nO1xuaW1wb3J0ICcuL2FwcC5jc3MnO1xuXG4oKCkgPT4ge1xuICBjb25zdCBidWlsZCA9IHtcbiAgICBoZWFkZXI6IGJ1aWxkSGVhZGVyLFxuICAgIG1haW46IGJ1aWxkTWFpbixcbiAgfTtcblxuICBjb25zdCBhcHAgPSB7XG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBhcHBXcmFwcGVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBhcHBXcmFwcGVyLmlkID0gJ2JhdHRsZXNoaXBfYXBwJztcblxuICAgICAgYXBwV3JhcHBlci5hcHBlbmRDaGlsZChidWlsZC5oZWFkZXIoKSk7XG4gICAgICBhcHBXcmFwcGVyLmFwcGVuZENoaWxkKGJ1aWxkLm1haW4oKSk7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFwcFdyYXBwZXIpO1xuICAgIH0sXG4gIH07XG5cbiAgYXBwLmluaXQoKTtcbn0pKCk7XG4iLCIiLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IGhlYWRlckNvbmZpZyBmcm9tICcuL2hlYWRlci5jb25maWcnO1xuaW1wb3J0IG5hdmJhciBmcm9tICcuL25hdmJhci9uYXZiYXInO1xuaW1wb3J0IG5vdGlmaWNhdGlvbnMgZnJvbSAnLi9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnMnO1xuaW1wb3J0ICcuLi8uLi9zdHlsZXMvaGVhZGVyLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgaGVhZGVyID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmhlYWRlciA9IGVsZW1lbnQ7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge30sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgaGVhZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoJ2hlYWRlcicpO1xuICAgICAgaGVhZGVyRWxlbWVudC5pZCA9ICdoZWFkZXInO1xuICAgICAgaGVhZGVyRWxlbWVudC5hcHBlbmRDaGlsZChuYXZiYXIoKSk7XG4gICAgICBoZWFkZXJFbGVtZW50LmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbnMoKSk7XG4gICAgICB0aGlzLmNhY2hlRE9NKGhlYWRlckVsZW1lbnQpO1xuXG4gICAgICByZXR1cm4gaGVhZGVyRWxlbWVudDtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBoZWFkZXIucmVuZGVyKCk7XG59O1xuIiwiaW1wb3J0IEljb25HaXRodWIgZnJvbSAnLi4vLi4vLi4vYXNzZXRzL2ljb25zL2dpdGh1Yl9tYXJrL2dpdGh1Yi1tYXJrLXdoaXRlLnN2Zyc7XG5cbmV4cG9ydCBkZWZhdWx0IFtcbiAge1xuICAgIGVsZW1lbnQ6ICd1bCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgY2xhc3M6ICduYXZfbGVmdCcsXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJyMnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtIG5hdl9sb2dvJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2ltZycsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgc3JjOiAnIycsXG4gICAgICAgICAgICAgICAgICAvLyBvbmxvYWQ6ICdTVkdJbmplY3QodGhpcyknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnaDEnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50OiAnQmF0dGxlc2hpcCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbiAge1xuICAgIGVsZW1lbnQ6ICd1bCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgY2xhc3M6ICduYXZfcmlnaHQnLFxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICcjJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbScsXG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnUGxhY2Vob2xkZXInLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICcjJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbScsXG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnUGxhY2Vob2xkZXInLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vbWlrZXlDb3MvYmF0dGxlc2hpcC90cmVlL21haW4nLFxuICAgICAgICAgICAgICB0YXJnZXQ6ICdfYmxhbmsnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2ltZycsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgc3JjOiBJY29uR2l0aHViLFxuICAgICAgICAgICAgICAgICAgb25sb2FkOiAnU1ZHSW5qZWN0KHRoaXMpJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgdGFyZ2V0OiAnX3NlbGYnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtIGxlYXZlX2dhbWUnLFxuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ0xlYXZlIGdhbWUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuXTtcbiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgbmF2YmFyQ29uZmlnIGZyb20gJy4vbmF2YmFyLmNvbmZpZyc7XG5pbXBvcnQgJy4uLy4uLy4uL3N0eWxlcy9uYXZiYXIuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBuYXZiYXIgPSB7XG4gICAgaW5pdCgpIHt9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMubmF2YmFyID0gZWxlbWVudDtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7fSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBuYXZFbGVtZW50ID0gY3JlYXRlRWxlbWVudCgnbmF2Jyk7XG4gICAgICBuYXZFbGVtZW50LmlkID0gJ25hdmJhcic7XG5cbiAgICAgIG5hdmJhckNvbmZpZy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hdkNoaWxkID0gY3JlYXRlRWxlbWVudChpdGVtLmVsZW1lbnQpO1xuICAgICAgICBuYXZDaGlsZC5zZXRBdHRyaWJ1dGVzKGl0ZW0uYXR0cmlidXRlcyk7XG4gICAgICAgIG5hdkNoaWxkLnNldENoaWxkcmVuKGl0ZW0uY2hpbGRyZW4pO1xuICAgICAgICBuYXZFbGVtZW50LmFwcGVuZENoaWxkKG5hdkNoaWxkKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmNhY2hlRE9NKG5hdkVsZW1lbnQpO1xuICAgICAgcmV0dXJuIG5hdkVsZW1lbnQ7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gbmF2YmFyLnJlbmRlcigpO1xufTtcbiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCAnLi4vLi4vLi4vc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBub3RpZmljYXRpb25zID0ge1xuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLnVwZGF0ZU5vdGlmaWNhdGlvbiA9IHRoaXMudXBkYXRlTm90aWZpY2F0aW9uLmJpbmQodGhpcyk7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLm5vdGlmaWNhdGlvbk1lc3NhZ2UgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJyNub3RpZmljYXRpb25fbWVzc2FnZScpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ25vdGlmeScsIHRoaXMudXBkYXRlTm90aWZpY2F0aW9uKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbnNDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbk1lc3NhZ2UgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgbm90aWZpY2F0aW9uc0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdub3RpZmljYXRpb25zX2NvbnRhaW5lcicpO1xuICAgICAgbm90aWZpY2F0aW9uTWVzc2FnZS5zZXRBdHRyaWJ1dGVzKHtcbiAgICAgICAgaWQ6ICdub3RpZmljYXRpb25fbWVzc2FnZScsXG4gICAgICAgIHRleHRDb250ZW50OiAnUGljayBnYW1lIG1vZGUnLFxuICAgICAgfSk7XG5cbiAgICAgIG5vdGlmaWNhdGlvbnNDb250YWluZXIuYXBwZW5kQ2hpbGQobm90aWZpY2F0aW9uTWVzc2FnZSk7XG4gICAgICB0aGlzLmNhY2hlRE9NKG5vdGlmaWNhdGlvbnNDb250YWluZXIpO1xuICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG5cbiAgICAgIHJldHVybiBub3RpZmljYXRpb25zQ29udGFpbmVyO1xuICAgIH0sXG4gICAgdXBkYXRlTm90aWZpY2F0aW9uKHNvbWV0aGluZykge1xuICAgICAgdGhpcy5ub3RpZmljYXRpb25NZXNzYWdlLnRleHRDb250ZW50ID0gc29tZXRoaW5nO1xuICAgIH0sXG4gIH07XG5cbiAgbm90aWZpY2F0aW9ucy5pbml0KCk7XG4gIHJldHVybiBub3RpZmljYXRpb25zLnJlbmRlcigpO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IFtcbiAgLy8ge1xuICAvLyAgIGVsZW1lbnQ6ICdoMicsXG4gIC8vICAgYXR0cmlidXRlczoge1xuICAvLyAgICAgdGV4dENvbnRlbnQ6ICdCYXR0bGVzaGlwJyxcbiAgLy8gICB9LFxuICAvLyB9LFxuICB7XG4gICAgZWxlbWVudDogJ3NlY3Rpb24nLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgIGNsYXNzOiAnZ2FtZW1vZGVfYnRucycsXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnYnV0dG9uJyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAnZ2FtZW1vZGVfYnRuIGh1bWFuX2h1bWFuJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnaHVtYW4gdnMgaHVtYW4nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICBjbGFzczogJ2dhbWVtb2RlX2J0biBodW1hbl9jb21wdXRlcicsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ2h1bWFuIHZzIGNvbXB1dGVyJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbl07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IGhvbWVDb25maWcgZnJvbSAnLi9ob21lLmNvbmZpZyc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL2hvbWUuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBob21lID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmhvbWUgPSBlbGVtZW50O1xuICAgICAgdGhpcy5oZWFkZXIgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvcignaDInKTtcbiAgICAgIHRoaXMubW9kZUJ0bnMgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvckFsbCgnLmdhbWVtb2RlX2J0bicpO1xuICAgICAgY29uc29sZS5sb2codGhpcy5ob21lKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMubW9kZUJ0bnMpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHRoaXMuc2V0R2FtZU1vZGUgPSB0aGlzLnNldEdhbWVNb2RlLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLm1vZGVCdG5zLmZvckVhY2goKGJ0bikgPT4gYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zZXRHYW1lTW9kZSkpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgaG9tZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgaG9tZUNvbnRhaW5lci5pZCA9ICdob21lJztcblxuICAgICAgaG9tZUNvbmZpZy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IGhvbWVDaGlsZCA9IGNyZWF0ZUVsZW1lbnQoaXRlbS5lbGVtZW50KTtcbiAgICAgICAgaWYgKGl0ZW0uYXR0cmlidXRlcykgaG9tZUNoaWxkLnNldEF0dHJpYnV0ZXMoaXRlbS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgaWYgKGl0ZW0uY2hpbGRyZW4pIGhvbWVDaGlsZC5zZXRDaGlsZHJlbihpdGVtLmNoaWxkcmVuKTtcbiAgICAgICAgaG9tZUNvbnRhaW5lci5hcHBlbmRDaGlsZChob21lQ2hpbGQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuY2FjaGVET00oaG9tZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIHJldHVybiBob21lQ29udGFpbmVyO1xuICAgIH0sXG4gICAgc2V0R2FtZU1vZGUoZSkge1xuICAgICAgY29uc3QgZ2FtZW1vZGUgPSAhZS5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC52YWx1ZS5pbmNsdWRlcygnY29tcHV0ZXInKTtcbiAgICAgIGNvbnNvbGUubG9nKGdhbWVtb2RlKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdtYWluX3JlbmRlcicsIGdhbWVtb2RlKTtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBob21lLnJlbmRlcigpO1xufTtcbiIsIiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgc2NyZWVuQ29udHJvbGxlciBmcm9tICcuLi9zY3JlZW4vc2NyZWVuQ29udHJvbGxlcic7XG5pbXBvcnQgbWFpbkNvbmZpZyBmcm9tICcuL21haW4uY29uZmlnJztcbmltcG9ydCBidWlsZEhvbWUgZnJvbSAnLi4vaG9tZS9ob21lJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGdhbWVJbml0IGZyb20gJy4uL3NjcmVlbi9zY3JlZW5Db250cm9sbGVyJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBidWlsZCA9IHtcbiAgICBob21lOiBidWlsZEhvbWUsXG4gICAgZ2FtZTogc2NyZWVuQ29udHJvbGxlcixcbiAgfTtcbiAgY29uc3QgbWFpbiA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5tYWluID0gZWxlbWVudDtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMubWFpbik7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpO1xuICAgICAgcHViU3ViLnN1YnNjcmliZSgnbWFpbl9yZW5kZXInLCB0aGlzLnJlbmRlcik7XG4gICAgfSxcbiAgICByZW5kZXIobW9kZSkge1xuICAgICAgaWYgKG1vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBtYWluQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIG1haW5Db250YWluZXIuaWQgPSAnbWFpbl9jb250ZW50JztcbiAgICAgICAgbWFpbkNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZC5ob21lKCkpO1xuICAgICAgICB0aGlzLmNhY2hlRE9NKG1haW5Db250YWluZXIpO1xuICAgICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIG1haW5Db250YWluZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1haW4uZmlyc3RFbGVtZW50Q2hpbGQucmVwbGFjZVdpdGgoYnVpbGQuZ2FtZShtb2RlKSk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gbWFpbi5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcblxuZXhwb3J0IGRlZmF1bHQgKHN0YXRlKSA9PiAoe1xuICBvZmZTZXRYOiAwLFxuICBvZmZTZXRZOiAwLFxuICBpbml0KCkge1xuICAgIGNvbnNvbGUubG9nKCdpbml0IHJ1bm5pbmcgZnJvbSBjb21wb3NlR2FtZScpO1xuICB9LFxuICByZW5kZXJTaGlwKGVsZW1lbnQpIHtcbiAgICAvLyBUaGlzIHdpbGwgYXBwZW5kIHRvIHRoZSBjb250ZW50IGRpdlxuICAgIGNvbnNvbGUubG9nKGVsZW1lbnQpO1xuICB9LFxuICBkcmFnU3RhcnRIYW5kbGVyKGUpIHtcbiAgICBjb25zb2xlLmxvZygnZHJhZyBzdGFydCcpO1xuICAgIHRoaXMuZHJhZ2dhYmxlID0gZS5jdXJyZW50VGFyZ2V0O1xuICAgIHRoaXMuZHJhZ1N0YXJ0ID0gZS50YXJnZXQucGFyZW50RWxlbWVudDtcbiAgICB0aGlzLmRyb3BQbGFjZWhvbGRlciA9IHRoaXMuZHJhZ2dhYmxlLmNsb25lTm9kZSgpO1xuICAgIHRoaXMuZHJvcFBsYWNlaG9sZGVyLmNsYXNzTGlzdC5hZGQoJ3NoaXBfYm94X3BsYWNlaG9sZGVyJyk7XG4gICAgdGhpcy5vZmZTZXRYID0gZS5jbGllbnRYO1xuICAgIHRoaXMub2ZmU2V0WSA9IGUuY2xpZW50WTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLmRyYWdNb3ZlSGFuZGxlcik7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICB9LFxuICBkcmFnTW92ZUhhbmRsZXIoZSkge1xuICAgIC8vIGNvbnNvbGUuY2xlYXIoKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZHJhZyBtb3ZlJyk7XG5cbiAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QuYWRkKCdkcmFnZ2luZycpO1xuICAgIHRoaXMuZHJhZ1N0YXJ0LmNsYXNzTGlzdC5hZGQoJ2RyYWdzdGFydCcpO1xuICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmxlZnQgPSBgJHtlLmNsaWVudFggLSB0aGlzLm9mZlNldFh9cHhgO1xuICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAke2UuY2xpZW50WSAtIHRoaXMub2ZmU2V0WX1weGA7XG5cbiAgICBjb25zdCB7IGxlZnQsIHRvcCwgd2lkdGggfSA9IHRoaXMuZHJhZ2dhYmxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHNoaXBMZW5ndGggPSBwYXJzZUludCh0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lmxlbmd0aCk7XG4gICAgY29uc3Qgb2ZmU2V0ID0gKHdpZHRoIC8gc2hpcExlbmd0aCkgKiAwLjU7XG4gICAgY29uc3QgY2VsbCA9IGRvY3VtZW50XG4gICAgICAuZWxlbWVudHNGcm9tUG9pbnQobGVmdCArIG9mZlNldCwgdG9wICsgb2ZmU2V0KVxuICAgICAgLmZpbmQoKGVsZW1lbnQpID0+IGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjZWxsJykpO1xuICAgIGlmIChjZWxsKSB7XG4gICAgICAvLyBEcmFnZ2luZyBvdmVyIGRyb3Agem9uZVxuICAgICAgLy8gSWYgZHJhZ2dhYmxlIGlzIG1vcmUgdGhhbiA1MCUgb3ZlciBpdCdzICdsYXN0JyBjZWxsXG4gICAgICAvLyAgQXBwZW5kIHRoZSBkcmFnZ2FibGUgdG8gdGhlIGNlbGwgY29udGVudCBjb250YWluZXJcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdkcmFnZ2luZyBvdmVyIGRyb3Agem9uZScpO1xuICAgICAgdGhpcy5jZWxsID0gY2VsbDtcbiAgICAgIGNvbnN0IHggPSBwYXJzZUludCh0aGlzLmNlbGwuZGF0YXNldC54KTtcbiAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh0aGlzLmNlbGwuZGF0YXNldC55KTtcblxuICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIGZhbHNlLCBpZCwgdHJ1ZSk7XG5cbiAgICAgIC8vIHRoaXMuZHJvcEhhbmRsZXIodHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERyYWdnaW5nIG92ZXIgYSBub24gZHJvcCB6b25lXG4gICAgICBpZiAoXG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5jb250YWlucygnc2hpcF9ib3hfdHJhbnNwYXJlbnQnKSAmJlxuICAgICAgICB0aGlzLmNlbGwuZmlyc3RDaGlsZC5sYXN0Q2hpbGRcbiAgICAgICkge1xuICAgICAgICB0aGlzLmNlbGwuZmlyc3RDaGlsZC5sYXN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuY2VsbCA9IG51bGw7XG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBkcmFnRW5kSGFuZGxlcihlKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2RyYWcgZW5kJyk7XG4gICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAwcHhgO1xuICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAwcHhgO1xuXG4gICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZ2dpbmcnKTtcbiAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QucmVtb3ZlKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgIHRoaXMuZHJhZ1N0YXJ0LmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdzdGFydCcpO1xuXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5kcmFnTW92ZUhhbmRsZXIpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmRyYWdFbmRIYW5kbGVyKTtcbiAgICAvLyB0aGlzLmRyb3BIYW5kbGVyKGZhbHNlKTtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmdhbWUucGxheWVyT25lQm9hcmQuYm9hcmQpO1xuICAgIGlmICh0aGlzLmNlbGwpIHtcbiAgICAgIC8vIElmIHVzZXIgaGFzIHN0b3BwZWQgZHJhZ2dpbmcgb3ZlciB0aGUgZHJvcCB6b25lXG4gICAgICAvLyBjb25zb2xlLmxvZyhgZHJhZ0VuZEhhbmRsZXIgcnVubmluZyB3aXRoIHRoaXMuY2VsbCBkZWZpbmVkYCk7XG4gICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICBjb25zdCB5ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueSk7XG4gICAgICBjb25zdCBzaGlwTGVuZ3RoID0gcGFyc2VJbnQodGhpcy5kcmFnZ2FibGUuZGF0YXNldC5sZW5ndGgpO1xuICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIGZhbHNlLCBpZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5kcmFnU3RhcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdwb3J0X3NoaXAnKSAmJiB0aGlzLmRyYWdnYWJsZSkge1xuICAgICAgLy8gSWYgZHJhZ1N0YXJ0IGlzIG5vdCB0aGUgcG9ydF9zaGlwIGVsZW1lbnRcbiAgICAgIC8vIGNvbnN0IGJ0biA9IHRoaXMuZHJhZ1N0YXJ0LnBhcmVudEVsZW1lbnQ7XG4gICAgICAvLyBjb25zdCB4ID0gcGFyc2VJbnQoYnRuLmRhdGFzZXQueCk7XG4gICAgICAvLyBjb25zdCB5ID0gcGFyc2VJbnQoYnRuLmRhdGFzZXQueSk7XG4gICAgICAvLyBjb25zdCBzaGlwTGVuZ3RoID0gcGFyc2VJbnQodGhpcy5kcmFnZ2FibGUuZGF0YXNldC5sZW5ndGgpO1xuICAgICAgLy8gY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgLy8gdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIGZhbHNlLCBpZCwgZmFsc2UpO1xuICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAtNCVgO1xuICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUudG9wID0gYC00JWA7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLmJvYXJkcy5wbGF5ZXJPbmUpO1xuICAgIH1cbiAgfSxcbiAgZHJvcEhhbmRsZXIoaXNEcmFnZ2luZywgaXNWYWxpZERyb3ApIHtcbiAgICAvLyBjb25zb2xlLmxvZygnZHJhZyBkcm9wJyk7XG4gICAgaWYgKHRoaXMuY2VsbCkge1xuICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSB0aGlzLmNlbGwuZmlyc3RDaGlsZDtcbiAgICAgIGlmIChpc0RyYWdnaW5nICYmIGlzVmFsaWREcm9wKSB7XG4gICAgICAgIC8vIElmIHVzZXIgaXMgZHJhZ2dpbmcgb3ZlciB0aGUgZHJvcCB6b25lXG4gICAgICAgIC8vIEhvdyB0byBoYW5kbGUgaWYgdGhlcmUgaXMgYSBzaGlwIGF0IG9yIG5lYXIgYSBjb29yZGluYXRlP1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgZHJhZ2dpbmcgb3ZlciBkcm9wIHpvbmVgKTtcbiAgICAgICAgY2VsbENvbnRlbnQuYXBwZW5kQ2hpbGQodGhpcy5kcm9wUGxhY2Vob2xkZXIpO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QuYWRkKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgfSBlbHNlIGlmICghaXNEcmFnZ2luZyAmJiBpc1ZhbGlkRHJvcCkge1xuICAgICAgICAvLyBJZiB1c2VyIGhhcyBzdG9wcGVkIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgZHJhZ2dpbmcgc3RvcHBlZCBvdmVyIHRoZSBkcm9wIHpvbmVgKTtcbiAgICAgICAgY2VsbENvbnRlbnQuYXBwZW5kQ2hpbGQodGhpcy5kcmFnZ2FibGUpO1xuICAgICAgICB0aGlzLmRyb3BQbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAtNCVgO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgLTQlYDtcbiAgICAgICAgLy8gdGhpcy5kcmFnZ2FibGUgPSBudWxsO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucm90YXRlSGFuZGxlcik7XG4gICAgICB9IGVsc2UgaWYgKGlzRHJhZ2dpbmcgJiYgIWlzVmFsaWREcm9wKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGB0aGVyZSBpcyBhIHNoaXAgb24gb3IgbmVhciBjb29yZGluYXRlc2ApO1xuICAgICAgICBpZiAodGhpcy5kcm9wUGxhY2Vob2xkZXIpIHtcbiAgICAgICAgICB0aGlzLmRyb3BQbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QucmVtb3ZlKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5jZWxsICYmIGlzRHJhZ2dpbmcgPT09IGZhbHNlKSB7XG4gICAgICAvLyBJZiB1c2VyIGhhcyBzdG9wcGVkIGRyYWdnaW5nIG91dHNpZGUgdGhlIGRyb3Agem9uZVxuICAgICAgLy8gRHJhZ2dhYmxlIG5lZWRzIHRvIGFwcGVuZCBiYWNrIHRvIHRoaXMuZHJhZ1N0YXJ0XG4gICAgICBjb25zb2xlLmxvZyhgZHJhZ2dpbmcgc3RvcHBlZCBvdXRzaWRlIHRoZSBkcm9wIHpvbmVgKTtcbiAgICB9XG4gIH0sXG4gIHJvdGF0ZUhhbmRsZXIoZSkge1xuICAgIGNvbnNvbGUubG9nKGByb3RhdGVIYW5kbGVyIGJlaW5nIGNhbGxlZGApO1xuICAgIGlmICghdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkcmFnZ2luZycpKSB7XG4gICAgICBjb25zb2xlLmxvZyhgcm90YXRlSGFuZGxlciBiZWluZyBjYWxsZWRgKTtcbiAgICB9XG4gIH0sXG4gIHJlc2V0KGUpIHtcbiAgICAvLyBDbGVhcnMgYm9hcmRcbiAgfSxcbiAgc3RhcnQoZSkge1xuICAgIC8vIFNldCB0aGlzLmdhbWVSZWFkeSB0byB0cnVlXG4gICAgLy8gUHVibGlzaCBzb21ldGhpbmcuLi4/XG4gICAgLy8gUmV2ZWFsIHBsYXllciB0d28ncyBib2FyZFxuICAgIHRoaXMuZ2FtZVJlYWR5ID0gdHJ1ZTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICAgIHRoaXMucmVuZGVyV2FpdCgpO1xuICB9LFxufSk7XG4iLCJpbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCBjb21wb3NlR2FtZSBmcm9tICcuL2NvbXBvc2VHYW1lJztcblxuZXhwb3J0IGRlZmF1bHQgKHN0YXRlKSA9PiAoe1xuICBpbml0KCkge1xuICAgIGNvbnNvbGUubG9nKGBpbml0IHJ1bm5pbmcgZnJvbSBwbGF5R2FtZWApO1xuICB9LFxuICB1bmJpbmRFdmVudHMoKSB7XG4gICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICB0aGlzLnBsYXllclR3b0JvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICB9LFxuICBnZXRCdXR0b24oW3gsIHldKSB7XG4gICAgLy8gRmluZCBidXR0b24gb24gdGhpcy5nYW1lLmFjdGl2ZVBsYXllcidzIGJvYXJkXG4gICAgLy8gZm9yIHdoaWNoIGl0J3MgZGF0YXNldC54ID09PSB4IGFuZCBkYXRhc2V0LnkgPT09IHlcbiAgICBjb25zdCBib2FyZCA9IFtcbiAgICAgIC4uLih0aGlzLmdhbWUuYWN0aXZlUGxheWVyID09PSB0aGlzLmdhbWUucGxheWVyT25lXG4gICAgICAgID8gdGhpcy5wbGF5ZXJUd29Cb2FyZFxuICAgICAgICA6IHRoaXMucGxheWVyT25lQm9hcmRcbiAgICAgICkuY2hpbGRyZW4sXG4gICAgXS5mbGF0TWFwKChyb3cpID0+IFsuLi5yb3cuY2hpbGRyZW5dKTtcbiAgICByZXR1cm4gYm9hcmQuZmluZCgoYnRuKSA9PiBidG4uZGF0YXNldC54ID09IHggJiYgYnRuLmRhdGFzZXQueSA9PSB5KTtcbiAgfSxcbiAgcmVuZGVyQXR0YWNrKGNlbGwsIGNvb3JkaW5hdGUpIHtcbiAgICBjb25zdCBidXR0b24gPSB0aGlzLmdldEJ1dHRvbihjb29yZGluYXRlKTtcbiAgICBidXR0b24uY2xhc3NMaXN0LmFkZChjZWxsLm1pc3MgPyAnbWlzcycgOiAnaGl0Jyk7XG4gIH0sXG4gIHJlbmRlcldhaXQoKSB7XG4gICAgbGV0IG5vdGlmaWNhdGlvbk1lc3NhZ2UgPSBgUGxheWVyIG9uZSdzIHR1cm4uYDtcbiAgICBpZiAodGhpcy5nYW1lLmFjdGl2ZVBsYXllciA9PT0gdGhpcy5nYW1lLnBsYXllck9uZSkge1xuICAgICAgLy8gSWYgZ2FtZS5hY3RpdmVQbGF5ZXIgaXMgTk9UIHBsYXllck9uZVxuICAgICAgLy8gUHV0ICd3YWl0JyBjbGFzcyBvbiB0aGUgcGxheWVyIG9uZSdzIGNvbnRhaW5lclxuICAgICAgY29uc29sZS5sb2coYFBsYXllciB0d28gYXR0YWNrcyBwbGF5ZXIgb25lYCk7XG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBZb3VyIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgT3Bwb25lbnQncyBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhgUGxheWVyIG9uZSBhdHRhY2tzIHBsYXllciB0d29gKTtcbiAgICAgIHRoaXMucGxheWVyT25lSGVhZGVyLnRleHRDb250ZW50ID0gYE9wcG9uZW50J3MgZ3JpZGA7XG4gICAgICB0aGlzLnBsYXllclR3b0hlYWRlci50ZXh0Q29udGVudCA9IGBZb3VyIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVDb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICBub3RpZmljYXRpb25NZXNzYWdlID0gYFBsYXllciB0d28ncyB0dXJuLmA7XG4gICAgfVxuXG4gICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsIG5vdGlmaWNhdGlvbk1lc3NhZ2UpO1xuXG4gICAgaWYgKCF0aGlzLm1vZGUgJiYgdGhpcy5nYW1lLmFjdGl2ZVBsYXllciA9PT0gdGhpcy5nYW1lLnBsYXllclR3bykge1xuICAgICAgLy8gT3B0aW9uYWwsIHB1dCBhIHNldFRpbWVvdXQoKVxuICAgICAgdGhpcy5nYW1lLnBsYXlSb3VuZCgpO1xuICAgIH1cbiAgfSxcbiAgZW5kR2FtZShtZXNzYWdlKSB7XG4gICAgdGhpcy51bmJpbmRFdmVudHMoKTtcbiAgICBwdWJTdWIucHVibGlzaCgnbm90aWZ5JywgbWVzc2FnZSk7XG4gICAgY29uc29sZS5sb2coYGdhbWUgaXMgb3ZlcmApO1xuICB9LFxuICBib2FyZEhhbmRsZXIoZSkge1xuICAgIGNvbnN0IGJ0biA9IGUudGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3QgeCA9IHBhcnNlSW50KGJ0bi5kYXRhc2V0LngpO1xuICAgIGNvbnN0IHkgPSBwYXJzZUludChidG4uZGF0YXNldC55KTtcbiAgICBpZiAoIWlzTmFOKHgpIHx8ICFpc05hTih5KSkge1xuICAgICAgY29uc3QgY2VsbCA9IHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIub3Bwb25lbnRCb2FyZC5nZXRCb2FyZENlbGwoW3gsIHldKTtcbiAgICAgIGlmIChjZWxsLm1pc3MgPT09IGZhbHNlIHx8IGNlbGwuaGl0ID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLmdhbWUucGxheVJvdW5kKFt4LCB5XSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxufSk7XG4iLCJleHBvcnQgZGVmYXVsdCBbXG4gIHtcbiAgICBlbGVtZW50OiAnZGl2JyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICBjbGFzczogJ3BvcnQnLFxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ3AnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgdGV4dENvbnRlbnQ6ICdEcmFnIHRoZSBzaGlwcyB0byB0aGUgZ3JpZCwgYW5kIHRoZW4gY2xpY2sgdG8gcm90YXRlOicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAncG9ydF9saW5lcycsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogOGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnNCcsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogOGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAncG9ydF9saW5lcycsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAncG9ydF9saW5lcycsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAncG9ydF9saW5lcycsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAgIC8vIGRyYWdnYWJsZTogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG5dO1xuIiwiaW1wb3J0IEdhbWVDb250cm9sbGVyIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvZ2FtZUNvbnRyb2xsZXInO1xuaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGNvbXBvc2VHYW1lIGZyb20gJy4vY29tcG9zZUdhbWUnO1xuaW1wb3J0IHBsYXlHYW1lIGZyb20gJy4vcGxheUdhbWUnO1xuaW1wb3J0IHBvcnRDb25maWcgZnJvbSAnLi9wb3J0LmNvbmZpZyc7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcyc7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9wb3J0LmNzcyc7XG5cbi8vIFRyeWluZyB0byBkZWNpZGUgd2hldGhlciBvciBub3QgaXQgaXMgYSBnb29kIGlkZWEgdG8gY3JlYXRlIGEgc2VwYXJhdGUgbW9kdWxlXG4vLyB0byBjb250cm9sIHRoZSBzY3JlZW4gYWZ0ZXIgcGxheWVycyBoYXZlIHBsYWNlZCBhbGwgdGhlaXIgc2hpcHNcbi8vIGFuZCBhZnRlciBhICdzdGFydCcgYnV0dG9uIGlzIGNsaWNrZWRcbmV4cG9ydCBkZWZhdWx0IChtb2RlKSA9PiB7XG4gIC8vIEJ1aWxkcyBlbXB0eSBib2FyZCBmb3IgcGxheWVycyB0byBwbGFjZSB0aGVpciBzaGlwc1xuICAvLyBtb2RlID09PSB0cnVlID0+IGh1bWFuIHZzIGh1bWFuXG4gIC8vIG1vZGUgPT09IGZhbHNlID0+IGh1bWFuIHZzIGNvbXB1dGVyXG5cbiAgY29uc3Qgc2NyZWVuQ29udHJvbGxlciA9IHtcbiAgICBtb2RlLFxuICAgIGdhbWVSZWFkeTogZmFsc2UsXG4gICAgZ2FtZTogR2FtZUNvbnRyb2xsZXIobW9kZSksXG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMuYm9hcmRzID0ge1xuICAgICAgICBwbGF5ZXJPbmU6IHRoaXMuZ2FtZS5wbGF5ZXJPbmVCb2FyZC5ib2FyZCxcbiAgICAgICAgcGxheWVyVHdvOiB0aGlzLmdhbWUucGxheWVyVHdvQm9hcmQuYm9hcmQsXG4gICAgICB9O1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsICdQbGFjZSBzaGlwcycpO1xuICAgICAgdGhpcy51cGRhdGVHYW1lU3RhdGUoY29tcG9zZUdhbWUpO1xuICAgICAgdGhpcy5zdGFydCA9IHRoaXMuc3RhcnQuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMucmVuZGVyU2hpcCA9IHRoaXMucmVuZGVyU2hpcC5iaW5kKHRoaXMpO1xuICAgIH0sXG4gICAgdXBkYXRlR2FtZVN0YXRlKGNhbGxiYWNrKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHRoaXMsIGNhbGxiYWNrKCkpO1xuICAgIH0sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5nYW1lQ29udGFpbmVyID0gZWxlbWVudDtcbiAgICAgIHRoaXMuYm9hcmRDb250YWluZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJyNib2FyZF9jb250YWluZXInKTtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZScpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfdHdvJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUJvYXJkID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZSA+IC5ib2FyZCcpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Cb2FyZCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl90d28gPiAuYm9hcmQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lSGVhZGVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZSA+IGg0Jyk7XG4gICAgICB0aGlzLnBsYXllclR3b0hlYWRlciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl90d28gPiBoNCcpO1xuICAgICAgdGhpcy5zdGFydEJ0biA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLmdhbWVfc3RhcnRfYnRuJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUNlbGxzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGxheWVyX29uZSA+IC5ib2FyZCA+IC5jZWxsJyk7XG4gICAgICB0aGlzLnBsYXllclR3b0NlbGxzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGxheWVyX3R3byA+IC5ib2FyZCA+IC5jZWxsJyk7XG5cbiAgICAgIHRoaXMuc2hpcHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zaGlwX2JveCcpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIGlmICghdGhpcy5nYW1lUmVhZHkpIHtcbiAgICAgICAgdGhpcy5kcmFnU3RhcnRIYW5kbGVyID0gdGhpcy5kcmFnU3RhcnRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZHJhZ0VuZEhhbmRsZXIgPSB0aGlzLmRyYWdFbmRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZHJhZ01vdmVIYW5kbGVyID0gdGhpcy5kcmFnTW92ZUhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kcm9wSGFuZGxlciA9IHRoaXMuZHJvcEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yb3RhdGVIYW5kbGVyID0gdGhpcy5yb3RhdGVIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc3RhcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLnN0YXJ0KTtcblxuICAgICAgICB0aGlzLnNoaXBzLmZvckVhY2goKHNoaXApID0+IHtcbiAgICAgICAgICBzaGlwLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuZHJhZ1N0YXJ0SGFuZGxlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBwdWJTdWIuc3Vic2NyaWJlKCdkcm9wJywgdGhpcy5kcm9wSGFuZGxlcik7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5nYW1lUmVhZHkpIHtcbiAgICAgICAgdGhpcy51cGRhdGVHYW1lU3RhdGUocGxheUdhbWUpO1xuICAgICAgICB0aGlzLnJlbmRlckF0dGFjayA9IHRoaXMucmVuZGVyQXR0YWNrLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZW5kR2FtZSA9IHRoaXMuZW5kR2FtZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlbmRlcldhaXQgPSB0aGlzLnJlbmRlcldhaXQuYmluZCh0aGlzKTtcbiAgICAgICAgcHViU3ViLnN1YnNjcmliZSgncmVuZGVyQXR0YWNrJywgdGhpcy5yZW5kZXJBdHRhY2spO1xuICAgICAgICBwdWJTdWIuc3Vic2NyaWJlKCdlbmRHYW1lJywgdGhpcy5lbmRHYW1lKTtcbiAgICAgICAgcHViU3ViLnN1YnNjcmliZSgncmVuZGVyV2FpdCcsIHRoaXMucmVuZGVyV2FpdCk7XG4gICAgICAgIHRoaXMuYm9hcmRIYW5kbGVyID0gdGhpcy5ib2FyZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgZ2FtZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ3NlY3Rpb24nKTtcbiAgICAgIGNvbnN0IGJvYXJkQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBwbGF5ZXJPbmVDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IHBsYXllclR3b0NvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgcGxheWVyT25lSGVhZGVyID0gY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgICAgIGNvbnN0IHBsYXllclR3b0hlYWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2g0Jyk7XG4gICAgICBjb25zdCBnYW1lU3RhcnRDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IGdhbWVTdGFydEJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgY29uc3QgZ2FtZVN0YXJ0QnRuVGV4dCA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgIGdhbWVTdGFydEJ0blRleHQudGV4dENvbnRlbnQgPSAnUGxheSc7XG4gICAgICBnYW1lQ29udGFpbmVyLmlkID0gJ2dhbWVfY29udGFpbmVyJztcbiAgICAgIGJvYXJkQ29udGFpbmVyLmlkID0gJ2JvYXJkX2NvbnRhaW5lcic7XG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgncGxheWVyX29uZScpO1xuICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3BsYXllcl90d28nKTtcbiAgICAgIHBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9ICdZb3VyIGdyaWQnO1xuICAgICAgcGxheWVyVHdvSGVhZGVyLnRleHRDb250ZW50ID0gYE9wcG9uZW50J3MgZ3JpZGA7XG4gICAgICBnYW1lU3RhcnRDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZ2FtZV9zdGFydCcpO1xuICAgICAgZ2FtZVN0YXJ0QnRuLmNsYXNzTGlzdC5hZGQoJ2dhbWVfc3RhcnRfYnRuJyk7XG4gICAgICAvLyBSZW5kZXJzIHBsYXllcnMnIGJvYXJkc1xuICAgICAgcGxheWVyT25lQ29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyQm9hcmQodGhpcy5ib2FyZHMucGxheWVyT25lKSk7XG4gICAgICBwbGF5ZXJUd29Db250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJCb2FyZCh0aGlzLmJvYXJkcy5wbGF5ZXJUd28pKTtcbiAgICAgIHBsYXllck9uZUNvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJPbmVIZWFkZXIpO1xuICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllclR3b0hlYWRlcik7XG4gICAgICBib2FyZENvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJPbmVDb250YWluZXIpO1xuICAgICAgYm9hcmRDb250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyVHdvQ29udGFpbmVyKTtcbiAgICAgIGdhbWVTdGFydEJ0bi5hcHBlbmRDaGlsZChnYW1lU3RhcnRCdG5UZXh0KTtcbiAgICAgIGdhbWVTdGFydENvbnRhaW5lci5hcHBlbmRDaGlsZChnYW1lU3RhcnRCdG4pO1xuICAgICAgaWYgKCF0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICBwbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2FpdCcpO1xuICAgICAgICBwbGF5ZXJUd29Db250YWluZXIuYXBwZW5kQ2hpbGQoZ2FtZVN0YXJ0Q29udGFpbmVyKTtcblxuICAgICAgICBwb3J0Q29uZmlnLmZvckVhY2goKHBvcnQpID0+IHtcbiAgICAgICAgICBjb25zdCBwbGF5ZXJPbmVQb3J0ID0gY3JlYXRlRWxlbWVudChwb3J0LmVsZW1lbnQpO1xuICAgICAgICAgIHBsYXllck9uZVBvcnQuc2V0QXR0cmlidXRlcyhwb3J0LmF0dHJpYnV0ZXMpO1xuICAgICAgICAgIHBsYXllck9uZVBvcnQuc2V0Q2hpbGRyZW4ocG9ydC5jaGlsZHJlbik7XG4gICAgICAgICAgcGxheWVyT25lQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllck9uZVBvcnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBwb3J0Q29uZmlnLmZvckVhY2goKHBvcnQpID0+IHtcbiAgICAgICAgICBjb25zdCBwbGF5ZXJUd29Qb3J0ID0gY3JlYXRlRWxlbWVudChwb3J0LmVsZW1lbnQpO1xuICAgICAgICAgIHBsYXllclR3b1BvcnQuc2V0QXR0cmlidXRlcyhwb3J0LmF0dHJpYnV0ZXMpO1xuICAgICAgICAgIHBsYXllclR3b1BvcnQuc2V0Q2hpbGRyZW4ocG9ydC5jaGlsZHJlbik7XG4gICAgICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllclR3b1BvcnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGdhbWVDb250YWluZXIuYXBwZW5kQ2hpbGQoYm9hcmRDb250YWluZXIpO1xuICAgICAgaWYgKHRoaXMuZ2FtZVJlYWR5KSB0aGlzLmdhbWVDb250YWluZXIucmVwbGFjZVdpdGgoZ2FtZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmNhY2hlRE9NKGdhbWVDb250YWluZXIpO1xuICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG4gICAgICBpZiAoIXRoaXMuZ2FtZVJlYWR5KSByZXR1cm4gZ2FtZUNvbnRhaW5lcjtcbiAgICAgIC8vIERvZXMgaGF2aW5nIHRoaXMgaWYgc3RhdGVtZW50IG1hdHRlcj9cbiAgICB9LFxuICAgIHJlbmRlckJvYXJkKGJvYXJkKSB7XG4gICAgICBjb25zdCBwbGF5ZXJCb2FyZCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgcGxheWVyQm9hcmQuY2xhc3NMaXN0LmFkZCgnYm9hcmQnKTtcbiAgICAgIGJvYXJkLmZvckVhY2goKHJvdywgeSkgPT4ge1xuICAgICAgICBjb25zdCBib2FyZFJvdyA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBib2FyZFJvdy5jbGFzc0xpc3QuYWRkKCdib2FyZF9yb3cnKTtcbiAgICAgICAgcm93LmZvckVhY2goKGNlbGwsIHgpID0+IHtcbiAgICAgICAgICBjb25zdCBjZWxsQnRuID0gY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICAgICAgY2VsbEJ0bi5zZXRBdHRyaWJ1dGVzKHtcbiAgICAgICAgICAgIGNsYXNzOiAnY2VsbCcsXG4gICAgICAgICAgICBbJ2RhdGEteCddOiB4ICsgMSxcbiAgICAgICAgICAgIFsnZGF0YS15J106IHJvdy5sZW5ndGggLSB5LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIE5lZWQgdG8gc2hvdyBvbmx5IGFjdGl2ZVBsYXllcidzIHNoaXBzXG4gICAgICAgICAgLy8gTmVlZCB0byBoaWRlIHRoZSBvcHBvbmVudCdzIHNoaXBzIHdoZW4gYWN0aXZlUGxheWVyIGNoYW5nZXNcbiAgICAgICAgICBjb25zdCBjZWxsQ29udGVudCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgIGlmIChjZWxsLnNoaXApIHtcbiAgICAgICAgICAgIC8vIFByb2JsZW0sIGFsbG93cyBvcHBvbmVudHMgdG8gY2hlYXQgaW4gYSBicm93c2VyIGRldmVsb3BlciB0b29sc1xuICAgICAgICAgICAgY29uc3QgY2VsbFNoaXAgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGNlbGxTaGlwLmNsYXNzTGlzdC5hZGQoJ3NoaXAnKTtcbiAgICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKGNlbGxTaGlwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2VsbENvbnRlbnQuY2xhc3NMaXN0LmFkZCgnY2VsbF9jb250ZW50Jyk7XG4gICAgICAgICAgY2VsbEJ0bi5hcHBlbmRDaGlsZChjZWxsQ29udGVudCk7XG4gICAgICAgICAgLy8gTmVlZCB0byBjaGVjayBmb3IgbGVmdCBhbmQgdG9wIGVkZ2VzIG9mIGJvYXJkXG4gICAgICAgICAgLy8gVG8gY3JlYXRlIHJvdyBhbmQgY29sdW1uIGxhYmVsc1xuICAgICAgICAgIGlmICh4ID09PSAwIHx8IHkgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd01hcmtlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgY29uc3QgY29sTWFya2VyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgICByb3dNYXJrZXIuc2V0QXR0cmlidXRlcyh7IGNsYXNzOiAncm93X21hcmtlcicsIHRleHRDb250ZW50OiBgJHt5ICsgMX1gIH0pO1xuICAgICAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChyb3dNYXJrZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoeSA9PT0gMCkge1xuICAgICAgICAgICAgICBjb2xNYXJrZXIuc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdjb2xfbWFya2VyJyxcbiAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogYCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIHgpfWAsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChjb2xNYXJrZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBib2FyZFJvdy5hcHBlbmRDaGlsZChjZWxsQnRuKTtcbiAgICAgICAgICAvLyBwbGF5ZXJCb2FyZC5hcHBlbmRDaGlsZChjZWxsQnRuKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHBsYXllckJvYXJkLmFwcGVuZENoaWxkKGJvYXJkUm93KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBsYXllckJvYXJkO1xuICAgIH0sXG4gIH07XG4gIHNjcmVlbkNvbnRyb2xsZXIuaW5pdCgpO1xuICByZXR1cm4gc2NyZWVuQ29udHJvbGxlci5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgR2FtZWJvYXJkIGZyb20gJy4vZ2FtZWJvYXJkJztcbmltcG9ydCBQbGF5ZXIgZnJvbSAnLi9wbGF5ZXInO1xuaW1wb3J0IHBpcGUgZnJvbSAnLi9waXBlJztcbmltcG9ydCBpc0h1bWFuIGZyb20gJy4vaXNIdW1hbic7XG5pbXBvcnQgaXNDb21wdXRlciBmcm9tICcuL2lzQ29tcHV0ZXInO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuL3B1YlN1Yic7XG4vLyBNb2R1bGUgdGhhdCBjb250cm9scyB0aGUgbWFpbiBnYW1lIGxvb3Bcbi8vIEZvciBub3cganVzdCBwb3B1bGF0ZSBlYWNoIEdhbWVib2FyZCB3aXRoIHByZWRldGVybWluZWQgY29vcmRpbmF0ZXMuXG4vLyBZb3UgYXJlIGdvaW5nIHRvIGltcGxlbWVudCBhIHN5c3RlbSBmb3IgYWxsb3dpbmcgcGxheWVycyB0byBwbGFjZSB0aGVpciBzaGlwcyBsYXRlci5cbmV4cG9ydCBkZWZhdWx0IChtb2RlKSA9PiB7XG4gIC8vIElmIG1vZGUgaXMgdHJ1ZSBwbGF5ZXIgdHdvIHdpbGwgYmUgYSBodW1hbiwgZWxzZSBhIGNvbXB1dGVyXG4gIC8vIFRoZSBnYW1lIGxvb3Agc2hvdWxkIHNldCB1cCBhIG5ldyBnYW1lIGJ5IGNyZWF0aW5nIFBsYXllcnMgYW5kIEdhbWVib2FyZHMuXG4gIC8vIDEuIENyZWF0ZSBnYW1lYm9hcmRzXG4gIC8vIDIuIENyZWF0ZSBwbGF5ZXJzIGFuZCBwYXNzIGluIHRoZWlyIGdhbWVib2FyZCBhbmQgdGhlIG9wcG9uZW50J3MgZ2FtZWJvYXJkLlxuICAvLyAgRG8gSSBvbmx5IG5lZWQgdG8gcGFzcyB0aGUgb3Bwb25lbnQncyBib2FyZD9cbiAgLy8gbGV0IGFjdGl2ZVBsYXllcjtcbiAgY29uc3QgcGxheWVyT25lQm9hcmQgPSBHYW1lYm9hcmQoKTtcbiAgY29uc3QgcGxheWVyVHdvQm9hcmQgPSBHYW1lYm9hcmQoKTtcblxuICBjb25zdCBwbGF5ZXJPbmUgPSBwaXBlKFBsYXllciwgaXNIdW1hbikocGxheWVyT25lQm9hcmQsIHBsYXllclR3b0JvYXJkKTtcbiAgY29uc3QgcGxheWVyVHdvID0gcGlwZShQbGF5ZXIsIG1vZGUgPyBpc0h1bWFuIDogaXNDb21wdXRlcikocGxheWVyVHdvQm9hcmQsIHBsYXllck9uZUJvYXJkKTtcblxuICBjb25zdCBwbGF5ZXJzID0gW3BsYXllck9uZSwgcGxheWVyVHdvXTtcbiAgbGV0IGFjdGl2ZVBsYXllciA9IHBsYXllcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMildO1xuXG4gIGNvbnN0IHN3aXRjaFBsYXllcnMgPSAocGxheWVyKSA9PiB7XG4gICAgaWYgKHBsYXllcikge1xuICAgICAgLy8gTG9va2luZyBpbnRvIExvZGFzaCBfLmlzRXF1YWwoKVxuICAgICAgLy8gQ291bGQgYWRkIGEgdHVybiBwcm9wZXJ0eSB0byBwbGF5ZXIgb2JqZWN0IHRoYXQgdGFrZXMgYSBib29sZWFuXG4gICAgICBhY3RpdmVQbGF5ZXIgPSBwbGF5ZXIgPT09IHBsYXllck9uZSA/IHBsYXllclR3byA6IHBsYXllck9uZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgcGxheVJvdW5kID0gKGNvb3JkaW5hdGUpID0+IHtcbiAgICAvLyBBbGxvdyBhIHBsYXllciB0byBhdHRhY2sgYWdhaW4gaWYgdGhlIGluaXRpYWwgYXR0YWNrIGhpdHMgYSBzaGlwXG4gICAgYWN0aXZlUGxheWVyLmF0dGFjayhjb29yZGluYXRlKTtcblxuICAgIGNvbnN0IHN0YXR1cyA9IGdldEdhbWVTdGF0dXMoKTtcbiAgICBpZiAoIXN0YXR1cy5zdGF0dXMpIHtcbiAgICAgIC8vIElmIGdhbWUgaXMgbm90IG92ZXIsIHN3aXRjaCBwbGF5ZXJzXG4gICAgICBzd2l0Y2hQbGF5ZXJzKGFjdGl2ZVBsYXllcik7XG4gICAgICBwdWJTdWIucHVibGlzaCgncmVuZGVyV2FpdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwdWJTdWIucHVibGlzaCgnZW5kR2FtZScsIHN0YXR1cy5tZXNzYWdlKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZ2V0R2FtZVN0YXR1cyA9ICgpID0+IHtcbiAgICBjb25zdCBzdGF0dXMgPSB7IHN0YXR1czogcGxheWVyT25lQm9hcmQuZ2V0U3RhdHVzKCkgfHwgcGxheWVyVHdvQm9hcmQuZ2V0U3RhdHVzKCkgfTtcbiAgICBpZiAoc3RhdHVzLnN0YXR1cykge1xuICAgICAgLy8gR2FtZSBpcyBvdmVyXG4gICAgICBjb25zdCBtZXNzYWdlID0gcGxheWVyT25lQm9hcmQuZ2V0U3RhdHVzKCkgPyAnUGxheWVyIHR3byB3b24hJyA6ICdQbGF5ZXIgb25lIHdvbiEnO1xuICAgICAgT2JqZWN0LmFzc2lnbihzdGF0dXMsIHsgbWVzc2FnZSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXR1cztcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHN3aXRjaFBsYXllcnMsXG4gICAgcGxheVJvdW5kLFxuICAgIGdldEdhbWVTdGF0dXMsXG4gICAgZ2V0IGFjdGl2ZVBsYXllcigpIHtcbiAgICAgIHJldHVybiBhY3RpdmVQbGF5ZXI7XG4gICAgfSxcbiAgICBnZXQgcGxheWVyT25lKCkge1xuICAgICAgcmV0dXJuIHBsYXllck9uZTtcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJUd28oKSB7XG4gICAgICByZXR1cm4gcGxheWVyVHdvO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllck9uZUJvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllck9uZUJvYXJkO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllclR3b0JvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllclR3b0JvYXJkO1xuICAgIH0sXG4gIH07XG59O1xuIiwiaW1wb3J0IFNoaXAgZnJvbSAnLi4vY29udGFpbmVycy9zaGlwJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi9wdWJTdWInO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIC8vIEtlZXAgdHJhY2sgb2YgbWlzc2VkIGF0dGFja3Mgc28gdGhleSBjYW4gZGlzcGxheSB0aGVtIHByb3Blcmx5LlxuICAvLyBCZSBhYmxlIHRvIHJlcG9ydCB3aGV0aGVyIG9yIG5vdCBhbGwgb2YgdGhlaXIgc2hpcHMgaGF2ZSBiZWVuIHN1bmsuXG4gIGNvbnN0IENlbGwgPSAoc2hpcCkgPT4ge1xuICAgIHJldHVybiBzaGlwXG4gICAgICA/IHtcbiAgICAgICAgICBzaGlwLFxuICAgICAgICAgIGhpdDogZmFsc2UsXG4gICAgICAgICAgYXR0YWNrKCkge1xuICAgICAgICAgICAgdGhpcy5oaXQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zaGlwLmhpdCgpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIDoge1xuICAgICAgICAgIG1pc3M6IGZhbHNlLFxuICAgICAgICAgIGF0dGFjaygpIHtcbiAgICAgICAgICAgIHRoaXMubWlzcyA9IHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgfTtcbiAgY29uc3QgYm9hcmQgPSBuZXcgQXJyYXkoMTApLmZpbGwoKS5tYXAoKCkgPT4gbmV3IEFycmF5KDEwKS5maWxsKCkubWFwKCgpID0+IENlbGwoKSkpO1xuICAvLyAxMCB4IDEwIGdyaWRcbiAgLy8gY29uc3QgYm9hcmQgPSBuZXcgQXJyYXkoMTApLmZpbGwoKS5tYXAoKCkgPT4gbmV3IEFycmF5KDEwKS5maWxsKHVuZGVmaW5lZCkpO1xuICAvKlxuICBbXG4gICAgICAgIDEgICAgIDIgICAgIDMgICAgIDQgICAgIDUgICAgIDYgICAgIDcgICAgIDggICAgIDkgICAgIDEwXG4gIDEwICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDBcbiAgMDkgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgMVxuICAwOCAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCAyXG4gIDA3ICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDNcbiAgMDYgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgNFxuICAwNSAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCA1XG4gIDA0ICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDZcbiAgMDMgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgN1xuICAwMiAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCA4XG4gIDAxICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDlcbiAgICAgICAgMCAgICAgMSAgICAgIDIgICAgMyAgICAgNCAgICAgNSAgICAgNiAgICAgNyAgICAgOCAgICAgOVxuICBdXG4gICovXG5cbiAgY29uc3QgcGFyc2VDb29yZGluYXRlID0gKFt4LCB5XSkgPT4ge1xuICAgIC8vIFBhcnNlcyBjb29yZGluYXRlIGlucHV0dGVkIGJ5IHVzZXIgc3VjaCB0aGF0XG4gICAgLy8gdGhlIHZhbHVlIHBhaXJzIGNhbiBiZSB1c2VkIGZvciBhY2Nlc3NpbmcgZWxlbWVudHNcbiAgICAvLyBpbiB0aGUgdHdvIGRpbWVuc2lvbmFsIGFycmF5XG4gICAgcmV0dXJuIFtib2FyZC5sZW5ndGggLSB5LCB4IC0gMV07XG4gIH07XG5cbiAgY29uc3QgZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMgPSAoW3gsIHldLCBvcmllbnRhdGlvbiwgc2hpcExlbmd0aCkgPT4ge1xuICAgIGNvbnN0IGNvb3JkaW5hdGVzID0gW1t4LCB5XV07XG5cbiAgICBpZiAob3JpZW50YXRpb24pIHtcbiAgICAgIC8vIFZlcnRpY2FsXG4gICAgICAvLyBbNSwgM10gaW4gMmQgYXJyYXkgdGVybXMgPT4gWzddWzRdLCBbOF1bNF0sIFs5XVs0XVxuICAgICAgZm9yIChsZXQgaSA9IHg7IGkgPCB4ICsgc2hpcExlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvb3JkaW5hdGVzLnB1c2goW2ksIHldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSG9yaXpvbnRhbFxuICAgICAgLy8gWzUsIDNdIGluIDJkIGFycmF5IHRlcm1zID0+IFs3XVs0XSwgWzddWzVdLCBbN11bNl1cbiAgICAgIGZvciAobGV0IGkgPSB5OyBpIDwgeSArIHNoaXBMZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjb29yZGluYXRlcy5wdXNoKFt4LCBpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvb3JkaW5hdGVzO1xuICB9O1xuXG4gIGNvbnN0IHZhbGlkYXRlQ29vcmRpbmF0ZSA9ICh4LCB5KSA9PiB7XG4gICAgcmV0dXJuIHggPj0gMCAmJiB4IDwgMTAgJiYgeSA+PSAwICYmIHkgPCAxMDtcbiAgfTtcblxuICBjb25zdCBjaGVja0JvYXJkID0gKFt4LCB5XSwgaWQpID0+IHtcbiAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIHNoaXAgYXQgeCBhbmQgeVxuICAgIC8vIENoZWNrIGlmIGFsbCBzdXJyb3VuZGluZyBjb29yZGluYXRlcyBhcmUgdW5kZWZpbmVkXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgc2hpcCBjYW4gYmUgcGxhY2VcbiAgICBjb25zdCBib29sZWFuID0gdmFsaWRhdGVDb29yZGluYXRlKHgsIHkpO1xuICAgIGNvbnN0IGNoZWNrID0gW1xuICAgICAgW3gsIHldLFxuICAgICAgW3gsIHkgKyAxXSxcbiAgICAgIFt4LCB5IC0gMV0sXG4gICAgICBbeCArIDEsIHldLFxuICAgICAgW3ggKyAxLCB5ICsgMV0sXG4gICAgICBbeCArIDEsIHkgLSAxXSxcbiAgICAgIFt4IC0gMSwgeV0sXG4gICAgICBbeCAtIDEsIHkgKyAxXSxcbiAgICAgIFt4IC0gMSwgeSAtIDFdLFxuICAgIF07XG4gICAgcmV0dXJuIGNoZWNrLmV2ZXJ5KChbYSwgYl0pID0+IHtcbiAgICAgIC8vIE5lZWQgdG8gY2hlY2sgaWYgYSBhbmQgYiBhcmUgd2l0aGluIHRoZSBib2FyZCdzIHNpemVcbiAgICAgIC8vIFRoZSB2YWx1ZSBvZiBhIGFuZCBiIGNhbiBvbmx5IGJlIGJldHdlZW4gZnJvbSAwIHRvIDkuXG4gICAgICAvLyBJdCBpcyBwb2ludGxlc3MgdG8gY2hlY2sgaWYgdGhlcmUgaXMgc3BhY2Ugd2hlbiBhIHNoaXAgaXMgcGxhY2VkIGF0IHRoZSBib3JkZXIgb2YgdGhlIGJvYXJkXG4gICAgICByZXR1cm4gdmFsaWRhdGVDb29yZGluYXRlKGEsIGIpXG4gICAgICAgID8gYm9vbGVhbiAmJiAoYm9hcmRbYV1bYl0uc2hpcCA9PT0gdW5kZWZpbmVkIHx8IGJvYXJkW2FdW2JdLnNoaXAuaWQgPT09IGlkKVxuICAgICAgICA6IGJvb2xlYW47XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgbWVtbyA9IFtdO1xuICBjb25zdCBwbGFjZVNoaXAgPSAoY29vcmRpbmF0ZXMsIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCBpZCwgaXNEcmFnZ2luZykgPT4ge1xuICAgIC8vIEJlIGFibGUgdG8gcGxhY2Ugc2hpcHMgYXQgc3BlY2lmaWMgY29vcmRpbmF0ZXMgYnkgY2FsbGluZyB0aGUgc2hpcCBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgIC8vIFNoaXAgbXVzdCBmaXQgb24gYm9hcmQgYmFzZWQgb24gY29vcmRpbmF0ZXNcbiAgICAvLyAgV2hhdCBpZiBzaGlwIGNhbiBiZSByb3RhdGVkP1xuICAgIC8vIElmIHNoaXAgaXMgaG9yaXpvbnRhbFxuICAgIC8vICBJbnZvbHZlcyBjb2x1bW5zXG4gICAgLy8gSWYgc2hpcCBpcyB2ZXJ0aWNhbFxuICAgIC8vICBJbnZvbHZlcyByb3dzXG4gICAgLy8gRm9yIGV4YW1wbGUsIGlmIHNoaXAgaXMgYSBsZW5ndGggb2YgNSBBTkQgaG9yaXpvbnRhbFxuICAgIC8vICBbeCwgeV0gPT4gWzUsIDNdID0+IHBsYWNlU2hpcChbNSwgM10pXG4gICAgLy8gIFNoaXAgc2hvdWxkIGJlIG9uIGJvYXJkIGZyb20gWzUsIDNdIHRvIFs5LCAzXVxuICAgIC8vICBCYXNlZCBvbiBhcnJheSA9PiBib2FyZFs3XVs0XSB0byBib2FyZFs3XVs4XVxuICAgIC8vIFdoYXQgaWYgY29vcmRpbmF0ZXMgYXJlIGJhc2VkIG9uIGRyYWdnYWJsZSBzaGlwcz9cbiAgICAvLyAgSG93IHRvIGRldGVybWluZSBpZiB0aGUgc2hpcCB3aWxsIGZpdCBvbiB0aGUgYm9hcmQ/XG4gICAgLy8gIEhvdyB0byBoYW5kbGUgaWYgdGhlIHNoaXAgZG9lcyBub3QgZml0IG9uIHRoZSBib2FyZD9cbiAgICAvLyBXaGF0IGlmIHRoZXJlIGlzIGEgc2hpcCBhbHJlYWR5IGF0IGdpdmVuIGNvb3JkaW5hdGVzP1xuICAgIC8vIEEgc2hpcCBNVVNUIGJlIDEgY29vcmRpbmF0ZSBhd2F5IGZyb20gYW5vdGhlciBzaGlwXG5cbiAgICAvLyBJZiBpZCBleGlzdHMgb24gYm9hcmRcbiAgICAvLyAgRmluZCB0aGUgY2VsbHMgd2l0aCBzaGlwLmlkID09PSBpZFxuICAgIC8vICBSZXBsYWNlIGNlbGxzIHdpdGggQ2VsbCgpXG4gICAgLy8gbWVtbyA9IG1lbW8uZmlsdGVyKChjZWxsKSA9PiB7XG4gICAgLy8gICBpZiAoY2VsbC5pZCA9PT0gaWQpIHtcbiAgICAvLyAgICAgY29uc3QgeyByb3csIGNvbCB9ID0gY2VsbDtcbiAgICAvLyAgICAgYm9hcmRbcm93XVtjb2xdID0gQ2VsbCgpO1xuICAgIC8vICAgICByZXR1cm4gZmFsc2U7XG4gICAgLy8gICB9IGVsc2Uge1xuICAgIC8vICAgICByZXR1cm4gdHJ1ZTtcbiAgICAvLyAgIH1cbiAgICAvLyB9KTtcblxuICAgIC8vIGNvbnN0IGlzU2hpcE9uQm9hcmQgPSBtZW1vLnNvbWUoKGNlbGwpID0+IGNlbGwuaWQgPT09IGlkKTtcbiAgICAvLyBpZiAoaXNTaGlwT25Cb2FyZCkge1xuICAgIC8vICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW1vLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgLy8gICAgIGlmIChtZW1vW2ldLmlkID09PSBpZCkge1xuICAgIC8vICAgICAgIGNvbnNvbGUubG9nKGBtZW1vW2ldLmlkOiAke21lbW9baV0uaWR9YCk7XG4gICAgLy8gICAgICAgY29uc29sZS5sb2coYGlkOiAke2lkfWApO1xuICAgIC8vICAgICAgIGNvbnN0IHsgcm93LCBjb2wgfSA9IG1lbW9baV07XG4gICAgLy8gICAgICAgYm9hcmRbcm93XVtjb2xdID0gQ2VsbCgpO1xuICAgIC8vICAgICAgIG1lbW8uc3BsaWNlKGksIDEpO1xuICAgIC8vICAgICB9XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG4gICAgY29uc3QgW3gsIHldID0gcGFyc2VDb29yZGluYXRlKGNvb3JkaW5hdGVzKTtcbiAgICBjb25zdCBzaGlwQ29vcmRpbmF0ZXMgPSBnZW5lcmF0ZVNoaXBDb29yZGluYXRlcyhbeCwgeV0sIG9yaWVudGF0aW9uLCBzaGlwTGVuZ3RoKTtcbiAgICBjb25zdCBpc1ZhbGlkQ29vcmRpbmF0ZXMgPSBzaGlwQ29vcmRpbmF0ZXMuZXZlcnkoKGNvb3JkaW5hdGUpID0+IHtcbiAgICAgIHJldHVybiBjaGVja0JvYXJkKGNvb3JkaW5hdGUsIGlkKTtcbiAgICB9KTtcblxuICAgIGlmIChpc1ZhbGlkQ29vcmRpbmF0ZXMgJiYgIWlzRHJhZ2dpbmcpIHtcbiAgICAgIGNvbnN0IG5ld1NoaXAgPSBTaGlwKHNoaXBMZW5ndGgsIGlkKTtcbiAgICAgIC8vIENoZWNrIGlmIHggYW5kIHkgYXJlIHdpdGhpbiB0aGUgYm9hcmQncyBzaXplXG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIHNoaXAgYXQgeCBhbmQgeVxuXG4gICAgICBjb25zdCBpc1NoaXBPbkJvYXJkID0gbWVtby5zb21lKChjZWxsKSA9PiBjZWxsLmlkID09PSBpZCk7XG4gICAgICBpZiAoaXNTaGlwT25Cb2FyZCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1lbW8ubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICBpZiAobWVtb1tpXS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcm93LCBjb2wgfSA9IG1lbW9baV07XG4gICAgICAgICAgICBib2FyZFtyb3ddW2NvbF0gPSBDZWxsKCk7XG4gICAgICAgICAgICBtZW1vLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG9yaWVudGF0aW9uKSB7XG4gICAgICAgIC8vIFZlcnRpY2FsXG4gICAgICAgIGZvciAobGV0IGkgPSB4OyBpIDwgeCArIG5ld1NoaXAubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICBib2FyZFtpXVt5XSA9IENlbGwobmV3U2hpcCk7XG4gICAgICAgICAgbWVtby5wdXNoKHsgcm93OiBpLCBjb2w6IHksIGlkIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBIb3Jpem9udGFsXG4gICAgICAgIC8vIGJvYXJkW3hdLmZpbGwobmV3U2hpcCwgeSwgeSArIG5ld1NoaXAubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IHk7IGkgPCB5ICsgbmV3U2hpcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGJvYXJkW3hdW2ldID0gQ2VsbChuZXdTaGlwKTtcbiAgICAgICAgICBtZW1vLnB1c2goeyByb3c6IHgsIGNvbDogaSwgaWQgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUHVic3ViIHB1Ymxpc2ggc29tZXRoaW5nLi4uKD8pXG4gICAgICBwdWJTdWIucHVibGlzaCgnZHJvcCcsIGZhbHNlLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGlzVmFsaWRDb29yZGluYXRlcyAmJiBpc0RyYWdnaW5nKSB7XG4gICAgICBjb25zb2xlLmxvZygnZHJhZ2dpbmcnKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdkcm9wJywgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmICghaXNWYWxpZENvb3JkaW5hdGVzICYmIGlzRHJhZ2dpbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKGB0aGVyZSBpcyBhIHNoaXAgb24gb3IgbmVhciBjb29yZGluYXRlc2ApO1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ2Ryb3AnLCB0cnVlLCBmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHNob3RzID0gW107XG4gIGNvbnN0IHZhbGlkYXRlQXR0YWNrID0gKHgsIHkpID0+IHtcbiAgICAvLyBDaGVja3MgaWYgY29vcmRpbmF0ZSBpcyB3aXRoIHRoZSBib2FyZCBzaXplIGFuZCBoYXMgbm90IGJlZW4gYXR0YWNrZWRcbiAgICBjb25zdCBbYSwgYl0gPSBwYXJzZUNvb3JkaW5hdGUoW3gsIHldKTtcbiAgICByZXR1cm4gIXNob3RzLmZpbmQoKFthLCBiXSkgPT4gYSA9PT0geCAmJiBiID09PSB5KSAmJiB2YWxpZGF0ZUNvb3JkaW5hdGUoYSwgYik7XG4gIH07XG5cbiAgY29uc3QgcmVjZWl2ZUF0dGFjayA9IChbeCwgeV0pID0+IHtcbiAgICAvLyBIYXZlIGEgcmVjZWl2ZUF0dGFjayBmdW5jdGlvbiB0aGF0IHRha2VzIGEgcGFpciBvZiBjb29yZGluYXRlc1xuICAgIC8vIERldGVybWluZXMgd2hldGhlciBvciBub3QgdGhlIGF0dGFjayBoaXQgYSBzaGlwXG4gICAgLy8gVGhlbiBzZW5kcyB0aGUg4oCYaGl04oCZIGZ1bmN0aW9uIHRvIHRoZSBjb3JyZWN0IHNoaXAsIG9yIHJlY29yZHMgdGhlIGNvb3JkaW5hdGVzIG9mIHRoZSBtaXNzZWQgc2hvdC5cbiAgICAvLyBDYW4gSSBzdG9yZSB0aGUgbWlzc2VkIHNob3RzIGRpcmVjdGx5IG9uIHRoZSBib2FyZD9cbiAgICAvLyBIb3cgdG8gaGFuZGxlIGlmIGEgY29vcmRpbmF0ZSBoYXMgYWxyZWFkeSBiZWVuIGF0dGFja2VkP1xuICAgIC8vICBUaHJvdyBhbiBlcnJvcj9cblxuICAgIGNvbnN0IGNlbGwgPSBnZXRCb2FyZENlbGwoW3gsIHldKTtcbiAgICBjb25zdCBpc1ZhbGlkQXR0YWNrID0gdmFsaWRhdGVBdHRhY2soeCwgeSk7XG5cbiAgICBpZiAoaXNWYWxpZEF0dGFjaykge1xuICAgICAgY2VsbC5hdHRhY2soKTtcbiAgICAgIHNob3RzLnB1c2goW3gsIHldKTtcbiAgICAgIC8vIFB1Ymxpc2ggdG8gdGhlIHNjcmVlbkNvbnRyb2xsZXIucmVuZGVyQXR0YWNrIG1ldGhvZD9cbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdyZW5kZXJBdHRhY2snLCBjZWxsLCBbeCwgeV0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBnZXRTdGF0dXMgPSAoKSA9PiB7XG4gICAgLy8gUmVwb3J0cyB3aGV0aGVyIG9yIG5vdCBhbGwgb2YgdGhlaXIgc2hpcHMgaGF2ZSBiZWVuIHN1bmsuXG4gICAgY29uc3QgZmxhdEJvYXJkID0gYm9hcmQuZmxhdCgpLmZpbHRlcigoY2VsbCkgPT4gY2VsbC5zaGlwICE9PSB1bmRlZmluZWQpO1xuICAgIHJldHVybiBmbGF0Qm9hcmQuZXZlcnkoKGNlbGwpID0+IGNlbGwuc2hpcC5pc1N1bmsoKSk7XG4gIH07XG5cbiAgY29uc3QgZ2V0Qm9hcmRDZWxsID0gKFt4LCB5XSkgPT4ge1xuICAgIGNvbnN0IFthLCBiXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgIHJldHVybiBib2FyZFthXVtiXTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHJlY2VpdmVBdHRhY2ssXG4gICAgcGxhY2VTaGlwLFxuICAgIGdldFN0YXR1cyxcbiAgICBnZXRCb2FyZENlbGwsXG4gICAgZ2V0IGJvYXJkKCkge1xuICAgICAgcmV0dXJuIGJvYXJkO1xuICAgIH0sXG4gIH07XG59O1xuXG5jb25zdCBudW1iZXJzID0gW1xuICBbXG4gICAge1xuICAgICAgbnVtOiB7XG4gICAgICAgIHZhbHVlOiAxLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG51bToge1xuICAgICAgICB2YWx1ZTogMixcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBudW06IHtcbiAgICAgICAgdmFsdWU6IDMsXG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgbnVtOiB7XG4gICAgICAgIHZhbHVlOiAxLFxuICAgICAgfSxcbiAgICB9LFxuICBdLFxuICBbXG4gICAge1xuICAgICAgbnVtOiB7XG4gICAgICAgIHZhbHVlOiA4LFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG51bToge1xuICAgICAgICB2YWx1ZTogMSxcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbl07XG5cbmNvbnN0IG5hciA9IHsgbnVtOiB7IHZhbHVlOiAxOTg3Mzk4Nzg5MjczIH0gfTtcbmNvbnN0IG1lbW8gPSBbXTtcbi8vIG51bWJlcnNbMF1bNF0gPSBuYXI7XG4vLyBjb25zdCByZWYgPSBudW1iZXJzWzBdWzRdO1xuLy8gbWVtby5wdXNoKHJlZik7XG4vLyBtZW1vWzBdID0ge307XG5tZW1vLnB1c2goeyB5OiAwLCB4OiA0IH0pO1xuIiwiLy8gZXhwb3J0IGRlZmF1bHQgKHBsYXllcikgPT4gKHtcbi8vICAgLy8gTWFrZSB0aGUg4oCYY29tcHV0ZXLigJkgY2FwYWJsZSBvZiBtYWtpbmcgcmFuZG9tIHBsYXlzLlxuLy8gICAvLyBUaGUgQUkgZG9lcyBub3QgaGF2ZSB0byBiZSBzbWFydCxcbi8vICAgLy8gQnV0IGl0IHNob3VsZCBrbm93IHdoZXRoZXIgb3Igbm90IGEgZ2l2ZW4gbW92ZSBpcyBsZWdhbFxuLy8gICAvLyAoaS5lLiBpdCBzaG91bGRu4oCZdCBzaG9vdCB0aGUgc2FtZSBjb29yZGluYXRlIHR3aWNlKS5cbi8vICAgc2hvdHM6IFtdLFxuLy8gICBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGU6ICgpID0+IHtcbi8vICAgICAvLyBSZXR1cm5zIHJhbmRvbSBjb29yZGluYXRlIHdpdGggdmFsdWVzIGJldHdlZW4gMSBhbmQgMTBcbi8vICAgICBjb25zdCBjb29yZGluYXRlID0gW107XG4vLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpICs9IDEpIHtcbi8vICAgICAgIGNvb3JkaW5hdGUucHVzaChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCArIDEpKTtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuIGNvb3JkaW5hdGU7XG4vLyAgIH0sXG4vLyAgIGF0dGFjazogKCkgPT4ge1xuLy8gICAgIC8vIFJldHVybnMgYSByYW5kb20gdW5pcXVlIGNvb3JkaW5hdGUgdGhhdCBpcyBpbi1ib3VuZHMgb2YgdGhlIGJvYXJkXG4vLyAgICAgLy8gTm90ZSwgaWYgc2hvdHMubGVuZ3RoIGlzIDEwMCwgZ2FtZSB3aWxsIGJlIG92ZXJcbi8vICAgICAvLyBUaGVyZSBhcmUgb25seSAxMDAgY29vcmRpbmF0ZXMgdG8gYXR0YWNrXG4vLyAgICAgd2hpbGUgKHBsYXllci5zaG90cy5sZW5ndGggPCAxMDApIHtcbi8vICAgICAgIGxldCBbeCwgeV0gPSBwbGF5ZXIuZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4vLyAgICAgICBpZiAoIXBsYXllci5zaG90cy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkpIHtcbi8vICAgICAgICAgcGxheWVyLm9wcG9uZW50Qm9hcmQucmVjZWl2ZUF0dGFjayhbeCwgeV0pO1xuLy8gICAgICAgICBwbGF5ZXIuc2hvdHMucHVzaChbeCwgeV0pO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgfSxcbi8vIH0pO1xuXG5leHBvcnQgZGVmYXVsdCAocGxheWVyKSA9PiB7XG4gIC8vIE1ha2UgdGhlIOKAmGNvbXB1dGVy4oCZIGNhcGFibGUgb2YgbWFraW5nIHJhbmRvbSBwbGF5cy5cbiAgLy8gVGhlIEFJIGRvZXMgbm90IGhhdmUgdG8gYmUgc21hcnQsXG4gIC8vIEJ1dCBpdCBzaG91bGQga25vdyB3aGV0aGVyIG9yIG5vdCBhIGdpdmVuIG1vdmUgaXMgbGVnYWxcbiAgLy8gKGkuZS4gaXQgc2hvdWxkbuKAmXQgc2hvb3QgdGhlIHNhbWUgY29vcmRpbmF0ZSB0d2ljZSkuXG5cbiAgY29uc3Qgc2hvdHMgPSBbXTtcbiAgY29uc3QgZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlID0gKCkgPT4ge1xuICAgIC8vIFJldHVybnMgcmFuZG9tIGNvb3JkaW5hdGUgd2l0aCB2YWx1ZXMgYmV0d2VlbiAxIGFuZCAxMFxuICAgIGNvbnN0IGNvb3JkaW5hdGUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDI7IGkgKz0gMSkge1xuICAgICAgY29vcmRpbmF0ZS5wdXNoKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwICsgMSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29vcmRpbmF0ZTtcbiAgfTtcbiAgY29uc3QgYXR0YWNrID0gKCkgPT4ge1xuICAgIC8vIFJldHVybnMgYSByYW5kb20gdW5pcXVlIGNvb3JkaW5hdGUgdGhhdCBpcyBpbi1ib3VuZHMgb2YgdGhlIGJvYXJkXG4gICAgLy8gTm90ZSwgaWYgc2hvdHMubGVuZ3RoIGlzIDEwMCwgZ2FtZSB3aWxsIGJlIG92ZXJcbiAgICAvLyBUaGVyZSBhcmUgb25seSAxMDAgY29vcmRpbmF0ZXMgdG8gYXR0YWNrXG4gICAgd2hpbGUgKHNob3RzLmxlbmd0aCA8IDEwMCkge1xuICAgICAgbGV0IFt4LCB5XSA9IGdlbmVyYXRlUmFuZG9tQ29vcmRpbmF0ZSgpO1xuICAgICAgaWYgKCFzaG90cy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkpIHtcbiAgICAgICAgcGxheWVyLm9wcG9uZW50Qm9hcmQucmVjZWl2ZUF0dGFjayhbeCwgeV0pO1xuICAgICAgICBzaG90cy5wdXNoKFt4LCB5XSk7XG4gICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB7IGF0dGFjayB9O1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IChwbGF5ZXIpID0+ICh7XG4gIGF0dGFjazogKFt4LCB5XSkgPT4ge1xuICAgIHBsYXllci5vcHBvbmVudEJvYXJkLnJlY2VpdmVBdHRhY2soW3gsIHldKTtcbiAgICByZXR1cm4gW3gsIHldO1xuICB9LFxufSk7XG4iLCIvLyBBcnRpY2xlcyBhYm91dCBsb29zZWx5IGNvdXBsaW5nIG9iamVjdCBpbmhlcml0YW5jZSB3aXRoIGZhY3RvcnkgZnVuY3Rpb25zIGFuZCBwaXBlXG4vLyBodHRwczovL21lZGl1bS5jb20vZGFpbHlqcy9idWlsZGluZy1hbmQtY29tcG9zaW5nLWZhY3RvcnktZnVuY3Rpb25zLTUwZmU5MDE0MTM3NFxuLy8gaHR0cHM6Ly93d3cuZnJlZWNvZGVjYW1wLm9yZy9uZXdzL3BpcGUtYW5kLWNvbXBvc2UtaW4tamF2YXNjcmlwdC01YjA0MDA0YWM5MzcvXG4vLyBPYnNlcnZhdGlvbjogaWYgdGhlcmUgaXMgbm8gaW5pdGlhbCB2YWx1ZSwgdGhlIGZpcnN0IGZ1bmN0aW9uIGRvZXMgbm90IHJ1blxuZXhwb3J0IGRlZmF1bHQgKGluaXRpYWxGbiwgLi4uZm5zKSA9PlxuICAoLi4udmFsdWVzKSA9PiB7XG4gICAgcmV0dXJuIGZucy5yZWR1Y2UoKG9iaiwgZm4pID0+IHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgZm4ob2JqKSk7XG4gICAgfSwgaW5pdGlhbEZuKHZhbHVlcykpO1xuICB9O1xuIiwiLy8gUGxheWVycyBjYW4gdGFrZSB0dXJucyBwbGF5aW5nIHRoZSBnYW1lIGJ5IGF0dGFja2luZyB0aGUgZW5lbXkgR2FtZWJvYXJkLlxuLy8gVGhlIGdhbWUgaXMgcGxheWVkIGFnYWluc3QgdGhlIGNvbXB1dGVyLFxuXG4vLyBEb2VzIGVhY2ggcGxheWVyIGhhdmUgdGhlaXIgb3duIGdhbWVib2FyZD9cbi8vIERvZXMgZWFjaCBwbGF5ZXIgaGF2ZSBhY2Nlc3MgdG8gdGhlIG9wcG9uZW50J3MgZ2FtZWJvYXJkP1xuLy8gSG93IHRvIGRlY2lkZSBpZiBnYW1lIGlzIHBsYXllciB2cyBwbGF5ZXIgYW5kIHBsYXllciB2cyBjb21wdXRlcj9cbmV4cG9ydCBkZWZhdWx0IChbcGxheWVyQm9hcmQsIG9wcG9uZW50Qm9hcmRdKSA9PiB7XG4gIC8vIGNvbnN0IGJvYXJkID0gcGxheWVyQm9hcmQ7XG4gIC8vIERvIEkgbmVlZCB0byBkZWNsYXJlIHRoZSBjb25zdCB2YXJpYWJsZT9cbiAgY29uc3Qgc3RhdGUgPSB7XG4gICAgZ2V0IG9wcG9uZW50Qm9hcmQoKSB7XG4gICAgICByZXR1cm4gb3Bwb25lbnRCb2FyZDtcbiAgICB9LFxuICAgIGdldCBib2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJCb2FyZDtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBzdGF0ZTtcbn07XG5cbi8qXG5jb25zdCBwaXBlID0gKGluaXRpYWxGbiwgLi4uZm5zKSA9PiB7XG4gIHJldHVybiBmbnMucmVkdWNlKChvYmosIGZuKSA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqLCBmbihvYmopKTtcbiAgfSwgaW5pdGlhbEZuKCkpO1xufTtcblxuY29uc3QgQW5pbWFsID0gKCkgPT4ge1xuICBsZXQgd2VpZ2h0O1xuXG4gIGNvbnN0IHN0YXRlID0ge1xuICAgIHdlaWdodCxcbiAgICBpbmZvOiAoKSA9PiAoe1xuICAgICAgd2VpZ2h0OiBzdGF0ZS53ZWlnaHQsXG4gICAgICBsZWdzOiBzdGF0ZS5sZWdzLFxuICAgIH0pLFxuICB9O1xuICByZXR1cm4gc3RhdGU7XG59O1xuXG5jb25zdCBDYXQgPSAoc3RhdGUpID0+ICh7XG4gIHR5cGU6ICdjYXQnLFxuICBsZWdzOiA0LFxuICBzcGVhazogKCkgPT4gYG1lb3csIEkgaGF2ZSAke3N0YXRlLmxlZ3N9IGxlZ3NgLFxuICBwb29wOiAoKSA9PiBgbWVvdy4uLkkgYW0gcG9vcGluZy5gLFxuICBwb29wQWdhaW46ICgpID0+IGAke3N0YXRlLnBvb3AoKX0gbWVvdyBtZW93Li4uSSBhbSBwb29waW5nIG9uY2UgbW9yZWAsXG59KTtcblxuY29uc3QgQmlyZCA9IChzdGF0ZSkgPT4gKHtcbiAgdHlwZTogJ2JpcmQnLFxuICBsZWdzOiAyLFxuICBzcGVhazogKCkgPT4gYGNoaXJwLi4uY2hpcnAsIEkgaGF2ZSAke3N0YXRlLmxlZ3N9IGxlZ3NgLFxuICBwb29wOiAoKSA9PiBgY2hpcnAuLi5JIGFtIHBvb3BpbmcuYCxcbiAgcG9vcEFnYWluOiAoKSA9PiBgJHtzdGF0ZS5wb29wKCl9IGNoaXJwIGNoaXJwLi4uSSBhbSBwb29waW5nIG9uY2UgbW9yZWAsXG59KTtcblxuY29uc3QgV2l6YXJkID0gKHN0YXRlKSA9PiAoe1xuICBmaXJlYmFsbDogKCkgPT4gYCR7c3RhdGUudHlwZX0gaXMgY2FzdGluZyBmaXJlYmFsbGAsXG59KTtcblxuY29uc3QgTmVjcm9tYW5jZXIgPSAoc3RhdGUpID0+ICh7XG4gIGRlZmlsZURlYWQ6ICgpID0+IGAke3N0YXRlLnR5cGV9IGlzIGNhc3RpbmcgZGVmaWxlIGRlYWRgLFxufSk7XG5cbmNvbnN0IGNhdCA9IHBpcGUoQW5pbWFsLCBDYXQsIFdpemFyZCk7XG5jb25zdCBiaXJkID0gcGlwZShBbmltYWwsIEJpcmQsIE5lY3JvbWFuY2VyKTtcbmNvbnNvbGUubG9nKGNhdC5maXJlYmFsbCgpKTtcbmNvbnNvbGUubG9nKGNhdC5zcGVhaygpKTtcbmNvbnNvbGUubG9nKGNhdC5pbmZvKCkpO1xuY2F0LndlaWdodCA9IDEwO1xuY29uc29sZS5sb2coY2F0LmluZm8oKSk7XG5jb25zb2xlLmxvZyhiaXJkLmRlZmlsZURlYWQoKSk7XG5jb25zb2xlLmxvZyhiaXJkLnNwZWFrKCkpO1xuY29uc29sZS5sb2coYmlyZC5pbmZvKCkpO1xuYmlyZC53ZWlnaHQgPSAzO1xuY29uc29sZS5sb2coYmlyZC5pbmZvKCkpO1xuKi9cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgc3Vic2NyaWJlcnM6IHt9LFxuICBzdWJzY3JpYmUoc3Vic2NyaWJlciwgZm4pIHtcbiAgICAvLyBXaGVuIHdvdWxkIHlvdSB3YW50IHRvIHN1YnNjcmliZSBhIHNpbmdsZSBmdW5jdGlvbiBpbiB0aGUgc2FtZSBzdWJzY3JpYmVyIG1vcmUgdGhhbiBvbmNlP1xuICAgIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0gPSB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdIHx8IFtdO1xuICAgIGlmICghdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5maW5kKChoYW5kbGVyKSA9PiBoYW5kbGVyLm5hbWUgPT09IGZuLm5hbWUpKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLnB1c2goZm4pO1xuICAgIH1cbiAgfSxcbiAgdW5zdWJzY3JpYmUoc3Vic2NyaWJlciwgZm4pIHtcbiAgICBpZiAodGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXSkge1xuICAgICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5zcGxpY2UodGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5pbmRleE9mKGZuKSwgMSk7XG4gICAgICBpZiAodGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5sZW5ndGggPT09IDApIGRlbGV0ZSB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdO1xuICAgIH1cbiAgfSxcbiAgcHVibGlzaChzdWJzY3JpYmVyLCAuLi5hcmdzKSB7XG4gICAgaWYgKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0pIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uZm9yRWFjaCgoZm4pID0+IGZuKC4uLmFyZ3MpKTtcbiAgICB9XG4gIH0sXG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgKHNoaXBMZW5ndGgsIHNoaXBJRCkgPT4ge1xuICAvLyBQcm9wZXJ0aWVzOlxuICAvLyAgTGVuZ3RoXG4gIC8vICBOdW1iZXJzIG9mIHRpbWVzIGhpdFxuICAvLyAgU3VuayAodHJ1ZS9mYWxzZSlcbiAgLy8gTWV0aG9kczpcbiAgLy8gIEhpdCwgaW5jcmVhc2VzIHRoZSBudW1iZXIgb2Yg4oCYaGl0c+KAmSBpbiB5b3VyIHNoaXAuXG4gIC8vICBpc1N1bmsoKSBjYWxjdWxhdGVzIHdoZXRoZXIgYSBzaGlwIGlzIGNvbnNpZGVyZWQgc3Vua1xuICAvLyAgICBCYXNlZCBvbiBpdHMgbGVuZ3RoIGFuZCB0aGUgbnVtYmVyIG9mIGhpdHMgaXQgaGFzIHJlY2VpdmVkLlxuICAvLyAtIENhcnJpZXJcdCAgICA1XG4gIC8vIC0gQmF0dGxlc2hpcFx0ICA0XG4gIC8vIC0gRGVzdHJveWVyXHQgIDNcbiAgLy8gLSBTdWJtYXJpbmVcdCAgM1xuICAvLyAtIFBhdHJvbCBCb2F0XHQyXG4gIC8vIGNvbnN0IGxlbmd0aCA9IHNpemU7XG4gIC8vIEhvdyBvciB3aGVuIHRvIGluaXRpYWxpemUgYSBzaGlwJ3MgbGVuZ3RoXG4gIC8vIFdoYXQgZGV0ZXJtaW5lcyBhIHNoaXBzIGxlbmd0aD9cbiAgY29uc3QgbGVuZ3RoID0gc2hpcExlbmd0aDtcbiAgY29uc3QgaWQgPSBzaGlwSUQ7XG4gIGxldCBudW1IaXRzID0gMDtcbiAgbGV0IHN1bmsgPSBmYWxzZTtcbiAgY29uc3QgaGl0ID0gKCkgPT4ge1xuICAgIGlmICghc3VuaykgbnVtSGl0cyArPSAxO1xuICB9O1xuICBjb25zdCBpc1N1bmsgPSAoKSA9PiB7XG4gICAgc3VuayA9IG51bUhpdHMgPT09IGxlbmd0aDtcbiAgICByZXR1cm4gc3VuaztcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGhpdCxcbiAgICBpc1N1bmssXG4gICAgZ2V0IGxlbmd0aCgpIHtcbiAgICAgIHJldHVybiBsZW5ndGg7XG4gICAgfSxcbiAgICBnZXQgaWQoKSB7XG4gICAgICByZXR1cm4gaWQ7XG4gICAgfSxcbiAgfTtcbn07XG4iLCJpbXBvcnQgZ2VuZXJhdGVVVUlEIGZyb20gJy4vZ2VuZXJhdGVVVUlEJztcblxuY29uc3QgQnVpbGRFbGVtZW50ID0gKHN0YXRlKSA9PiAoe1xuICBzZXRBdHRyaWJ1dGVzOiAoYXR0cmlidXRlcykgPT4ge1xuICAgIE9iamVjdC5lbnRyaWVzKGF0dHJpYnV0ZXMpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgaWYgKGtleSAhPT0gJ3RleHRDb250ZW50Jykge1xuICAgICAgICBpZiAoa2V5ID09PSAnY2xhc3MnKSB7XG4gICAgICAgICAgc3RhdGUuc2V0Q2xhc3NOYW1lKHZhbHVlLnNwbGl0KC9cXHMvKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnc3R5bGUnKSB7XG4gICAgICAgICAgc3RhdGUuc2V0U3R5bGUodmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJ2RhdGEtaWQnKSB7XG4gICAgICAgICAgc3RhdGUuc2V0QXR0cmlidXRlKGtleSwgZ2VuZXJhdGVVVUlEKCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0YXRlLnNldEF0dHJpYnV0ZShrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUuc2V0VGV4dENvbnRlbnQodmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBzZXRTdHlsZTogKHRleHQpID0+IHtcbiAgICBzdGF0ZS5zdHlsZS5jc3NUZXh0ID0gdGV4dDtcbiAgfSxcbiAgc2V0Q2xhc3NOYW1lOiAoYXJyQ2xhc3MpID0+IHtcbiAgICBhcnJDbGFzcy5mb3JFYWNoKChjbGFzc05hbWUpID0+IHN0YXRlLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKSk7XG4gIH0sXG4gIHNldFRleHRDb250ZW50OiAodGV4dCkgPT4ge1xuICAgIHN0YXRlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgfSxcbiAgc2V0Q2hpbGRyZW46IChjaGlsZHJlbikgPT4ge1xuICAgIGNoaWxkcmVuLmZvckVhY2goKGNoaWxkKSA9PiB7XG4gICAgICBjb25zdCBjaGlsZEVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KGNoaWxkLmVsZW1lbnQpO1xuICAgICAgaWYgKGNoaWxkLmF0dHJpYnV0ZXMgJiYgY2hpbGQuYXR0cmlidXRlcy5jb25zdHJ1Y3Rvci5uYW1lID09PSAnT2JqZWN0Jykge1xuICAgICAgICBjaGlsZEVsZW1lbnQuc2V0QXR0cmlidXRlcyhjaGlsZC5hdHRyaWJ1dGVzKTtcbiAgICAgIH1cbiAgICAgIGlmIChjaGlsZC5jaGlsZHJlbikge1xuICAgICAgICAvLyBXaGF0IGlmIGNoaWxkIG9mIGNoaWxkLmNoaWxkcmVuIGhhcyBjaGlsZHJlbj9cbiAgICAgICAgY2hpbGRFbGVtZW50LnNldENoaWxkcmVuKGNoaWxkLmNoaWxkcmVuKTtcbiAgICAgIH1cbiAgICAgIHN0YXRlLmFwcGVuZENoaWxkKGNoaWxkRWxlbWVudCk7XG4gICAgfSk7XG4gIH0sXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWcpIHtcbiAgY29uc3QgaHRtbEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG5cbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oaHRtbEVsZW1lbnQsIEJ1aWxkRWxlbWVudChodG1sRWxlbWVudCkpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCB1dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgcmV0dXJuIHV1aWQuc3Vic3RyaW5nKDAsIHV1aWQuaW5kZXhPZignLScpKTtcbn07XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=