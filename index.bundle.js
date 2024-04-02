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

.ship_box_placeholder {
  border-color: #40bf44;
  background: rgba(64, 191, 68, 0.05);
}

.rotate_error {
  border-color: red;
}
`, "",{"version":3,"sources":["webpack://./src/styles/port.css"],"names":[],"mappings":"AAAA;EACE,aAAa;AACf;;AAEA;EACE,kBAAkB;EAClB,0BAA0B;EAC1B,aAAa;EACb,6BAA6B;AAC/B;;AAEA;EACE,UAAU;EACV,kBAAkB;EAClB,iCAAiC;EACjC,sBAAsB;EACtB,OAAO;EACP,MAAM;EACN,6BAA6B;AAC/B;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,6CAA6C;EAC7C,SAAS;EACT,QAAQ;AACV;;AAEA;EACE,uBAAuB;EACvB,mBAAmB;AACrB;;AAEA;EACE,qBAAqB;EACrB,mCAAmC;AACrC;;AAEA;EACE,iBAAiB;AACnB","sourcesContent":[".port_lines {\n  display: flex;\n}\n\n.port_ship {\n  position: relative;\n  border: 1px dotted #b2b2b9;\n  margin: 0.5em;\n  /* box-sizing: content-box; */\n}\n\n.ship_box {\n  z-index: 2;\n  position: absolute;\n  background: rgba(0, 0, 255, 0.05);\n  border: 2px solid #00f;\n  left: 0;\n  top: 0;\n  /* box-sizing: content-box; */\n}\n\n.ship_box:hover {\n  cursor: move;\n}\n\n.cell_content > .ship_box {\n  /* Comment out if using box-sizing: content */\n  left: -4%;\n  top: -4%;\n}\n\n.ship_box.dragging.ship_box_transparent {\n  background: transparent;\n  border: transparent;\n}\n\n.ship_box_placeholder {\n  border-color: #40bf44;\n  background: rgba(64, 191, 68, 0.05);\n}\n\n.rotate_error {\n  border-color: red;\n}\n"],"sourceRoot":""}]);
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
  gap: 8rem;
  user-select: none;
}

#boards_container > * > .board > * {
  display: flex;
}

#boards_container > *.wait > *:not(.game_start) {
  opacity: 0.4;
}

#boards_container > * > .board > * > button {
  cursor: pointer;
  border: none;
}

#boards_container > *:not(.wait) > * > * > .cell > .cell_content > .ship {
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
#boards_container > * > .board > * > .cell.hit > .cell_content > .ship {
  background-color: red;
}

#boards_container > * > .board > * > .cell.miss > .cell_content {
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
`, "",{"version":3,"sources":["webpack://./src/styles/screenController.css"],"names":[],"mappings":"AAAA;EACE,eAAe;EACf,aAAa;EACb,SAAS;EACT,iBAAiB;AACnB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,eAAe;EACf,YAAY;AACd;;AAEA;EACE,6BAA6B;AAC/B;;AAEA;;EAEE,kBAAkB;EAClB,kBAAkB;AACpB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,cAAc;EACd,kBAAkB;EAClB,QAAQ;AACV;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,UAAU;EACV,WAAW;EACX,kBAAkB;EAClB,uBAAuB;EACvB,0BAA0B;EAC1B,uBAAuB;EACvB,6BAA6B;AAC/B;;AAEA;EACE;;;GAGC;EACD,oBAAoB;EACpB,eAAe;EACf,gCAAgC;AAClC;;AAEA,+FAA+F;AAC/F;EACE,qBAAqB;AACvB;;AAEA;EACE,sBAAsB;AACxB;;AAEA;EACE,kBAAkB;EAClB,YAAY;EACZ,aAAa;EACb,UAAU;EACV,MAAM;EACN,mBAAmB;EACnB,WAAW;AACb;;AAEA;EACE,kBAAkB;EAClB,SAAS;EACT,kBAAkB;EAClB,WAAW;EACX,WAAW;AACb","sourcesContent":["#boards_container {\n  margin-top: 4em;\n  display: flex;\n  gap: 8rem;\n  user-select: none;\n}\n\n#boards_container > * > .board > * {\n  display: flex;\n}\n\n#boards_container > *.wait > *:not(.game_start) {\n  opacity: 0.4;\n}\n\n#boards_container > * > .board > * > button {\n  cursor: pointer;\n  border: none;\n}\n\n#boards_container > *:not(.wait) > * > * > .cell > .cell_content > .ship {\n  background-color: transparent;\n}\n\n.player_one,\n.player_two {\n  position: relative;\n  width: min-content;\n}\n\n.player_two > .game_start {\n  display: none;\n}\n\n.player_two.wait > .game_start {\n  display: block;\n  position: absolute;\n  top: 20%;\n}\n\n.game_start > button {\n  font-size: 4rem;\n}\n\n.cell > * {\n  width: 2em;\n  height: 2em;\n  position: relative;\n  background-color: white;\n  /* pointer-events: none; */\n  border: 1px solid black;\n  /* box-sizing: content-box; */\n}\n\n.cell > .cell_content > .ship {\n  /*\n  Show ship during placing ships phase\n  Show only active player's ship when game is in play\n  */\n  pointer-events: none;\n  height: inherit;\n  background-color: cornflowerblue;\n}\n\n/* #board_container > *:not(.wait) > .board > .board_row > .cell.hit > .cell_content > .ship, */\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship {\n  background-color: red;\n}\n\n#boards_container > * > .board > * > .cell.miss > .cell_content {\n  background-color: grey;\n}\n\n.cell_content > .row_marker {\n  position: absolute;\n  height: 100%;\n  display: flex;\n  left: -2em;\n  top: 0;\n  align-items: center;\n  z-index: -1;\n}\n\n.cell_content > .col_marker {\n  position: absolute;\n  top: -2em;\n  text-align: center;\n  width: 100%;\n  z-index: -1;\n}\n"],"sourceRoot":""}]);
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

    // document.addEventListener('mouseup', this.dragEndHandler);
    this.dragTimer = setTimeout(() => {
      console.log(`adding mousemove and mouseup events`);
      document.addEventListener('mousemove', this.dragMoveHandler);
      document.addEventListener('mouseup', this.dragEndHandler);
      this.draggable.removeEventListener('click', this.rotateHandler);
    }, 250);

    // if (parseInt(this.draggable.dataset.length) > 1) {
    this.draggable.addEventListener('click', this.rotateHandler, { once: true });
    // }
  },
  dragMoveHandler(e) {
    // console.clear();
    console.log('drag move');
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
      this.cell = cell;
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);

      const id = this.draggable.dataset.id;
      const orientation = this.draggable.dataset.orientation !== 'h';
      this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, true, false, id);
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
    console.log('drag end');
    this.draggable.style.left = `0px`;
    this.draggable.style.top = `0px`;

    this.draggable.classList.remove('dragging');
    this.draggable.classList.remove('ship_box_transparent');
    this.dragStart.classList.remove('dragstart');

    document.removeEventListener('mousemove', this.dragMoveHandler);
    document.removeEventListener('mouseup', this.dragEndHandler);
    // console.log(this.game.playerOneBoard.board);
    if (this.cell) {
      // If user has stopped dragging over the drop zone
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);
      const shipLength = parseInt(this.draggable.dataset.length);
      const id = this.draggable.dataset.id;
      const orientation = this.draggable.dataset.orientation !== 'h';
      this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, false, false, id);
    }

    if (!this.dragStart.classList.contains('port_ship') && this.draggable) {
      // If dragStart is not the port_ship element
      this.draggable.style.left = `-4%`;
      this.draggable.style.top = `-4%`;
    }
  },
  dropHandler(isDragging, isValidDrop) {
    // console.log('drag drop');
    if (this.cell) {
      const cellContent = this.cell.firstChild;
      if (isDragging && isValidDrop) {
        // If user is dragging over the drop zone
        cellContent.appendChild(this.dropPlaceholder);
        this.draggable.classList.add('ship_box_transparent');
      } else if (!isDragging && isValidDrop) {
        // If user has stopped dragging over the drop zone
        console.log(`dragging stopped over the drop zone`);
        cellContent.appendChild(this.draggable);
        this.dropPlaceholder.remove();
        this.draggable.style.left = `-4%`;
        this.draggable.style.top = `-4%`;
      } else if (isDragging && !isValidDrop) {
        // If user is dragging over an invalid drop
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
    const newOrientation = this.draggable.dataset.orientation === 'h';
    if (e instanceof MouseEvent) {
      clearTimeout(this.dragTimer);
      if (
        !this.draggable.classList.contains('dragging') &&
        !this.dragStart.classList.contains('port_ship')
      ) {
        // If ship is not being dragged and it is not in port
        e.preventDefault();
        console.log(`rotateHandler being called`);
        this.cell = this.dragStart.parentElement;
        const x = parseInt(this.cell.dataset.x);
        const y = parseInt(this.cell.dataset.y);
        const shipLength = parseInt(this.draggable.dataset.length);
        const id = this.draggable.dataset.id;
        this.game.playerOneBoard.placeShip([x, y], shipLength, newOrientation, false, true, id);
        console.log(this.boards.playerOne);
      }
      e.stopImmediatePropagation();
    } else if (e === true && parseInt(this.draggable.dataset.length) > 1) {
      this.draggable.dataset.orientation = newOrientation ? 'v' : 'h';
      const newWidth = newOrientation ? this.draggable.style.width : this.draggable.style.height;
      const newHeight = newOrientation ? this.draggable.style.height : this.draggable.style.width;
      this.draggable.style.width = newOrientation ? newHeight : newWidth;
      this.draggable.style.height = newOrientation ? newWidth : newHeight;
    } else if (e === false) {
      this.draggable.classList.add('rotate_error');
      setTimeout(() => {
        this.draggable.classList.remove('rotate_error');
      }, 250);
    }
  },
  reset(e) {
    // Clears board
  },
  start(e) {
    // Set this.gameReady to true
    // Publish something...?
    // Reveal player two's board
    if (!this.mode) {
      // this.boards.playerTwo.placeShipsRandom();
      this.game.playerTwo.board.placeShipsRandom();
      console.log(this.game.playerTwo.board.board);
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
                  class: 'reset_btn',
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
        this.reset = this.reset.bind(this);

        this.ships.forEach((ship) => {
          // https://stackoverflow.com/questions/40464690/want-to-perform-different-task-on-mousedown-and-click-event
          ship.addEventListener('mousedown', this.dragStartHandler);
        });

        if (!this.mode) {
          this.startBtn.addEventListener('click', this.start);
        }
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('drop', this.dropHandler);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('rotate', this.rotateHandler);
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
      const boardsContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerOneContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerTwoContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const playerOneHeader = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('h4');
      const playerTwoHeader = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('h4');
      const gameStartContainer = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('div');
      const gameStartBtn = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('button');
      const gameStartBtnText = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])('span');
      gameStartBtnText.textContent = 'Play';
      gameContainer.id = 'game_container';
      boardsContainer.id = 'boards_container';
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
      boardsContainer.appendChild(playerOneContainer);
      boardsContainer.appendChild(playerTwoContainer);
      gameStartBtn.appendChild(gameStartBtnText);
      gameStartContainer.appendChild(gameStartBtn);
      if (!this.gameReady) {
        _port_config__WEBPACK_IMPORTED_MODULE_5__["default"].forEach((port) => {
          const playerOnePort = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])(port.element);
          playerOnePort.setAttributes(port.attributes);
          playerOnePort.setChildren(port.children);
          playerOneContainer.appendChild(playerOnePort);
        });

        if (this.mode) {
          _port_config__WEBPACK_IMPORTED_MODULE_5__["default"].forEach((port) => {
            const playerTwoPort = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_1__["default"])(port.element);
            playerTwoPort.setAttributes(port.attributes);
            playerTwoPort.setChildren(port.children);
            playerTwoContainer.appendChild(playerTwoPort);
          });
        } else {
          playerTwoContainer.classList.add('wait');
          playerTwoContainer.appendChild(gameStartContainer);
        }
      }
      gameContainer.appendChild(boardsContainer);
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
/* harmony import */ var _helpers_generateUUID__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../helpers/generateUUID */ "./src/helpers/generateUUID.js");




/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (() => {
  // Keep track of missed attacks so they can display them properly.
  // Be able to report whether or not all of their ships have been sunk.
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
  const clearBoard = () => {
    for (let i = 0; i < memo.length; i += 1) {
      const { row, col } = memo[i];
      console.log(`row: ${row} | col: ${col}`);
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

  const generateRandomCoordinate = () => {
    // Returns random coordinate with values between 1 and 10
    const coordinate = [];
    for (let i = 0; i < 2; i += 1) {
      coordinate.push(Math.floor(Math.random() * 10 + 1));
    }
    return coordinate;
  };

  // const generateRandomCoordinates = (ships) => {
  //   const coordinates = [];
  //   // Generate an array of unique coordinates
  //   // The array must equal to the amount of ships
  //   let i = 0;
  //   while (i < ships.length) {
  //     const [x, y] = generateRandomCoordinate();
  //     const orientation = Math.floor(Math.random() * 2) === 1;
  //     const shipCoordinates = generateShipCoordinates([x, y])
  //     const isValidCoordinate = shipCoordinates(checkBoard);
  //     if (!coordinates.find(([a, b]) => a === x && b === y)) {
  //       coordinates.push([x, y]);
  //       console.log(ships[i]);
  //       i += 1;
  //     } else {
  //       continue;
  //     }
  //   }
  //   return coordinates;
  // };

  const generateShipCoordinates = ([x, y], orientation, shipLength) => {
    const coordinates = [];

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

  const placeShip = (coordinates, shipLength, orientation, isDragging, isRotating, id) => {
    // How many parameters is too much?

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

    console.log(...shipCoordinates);
    console.log(isValidCoordinates);
    if (isValidCoordinates && !isDragging) {
      const newShip = (0,_containers_ship__WEBPACK_IMPORTED_MODULE_0__["default"])(shipLength, id);
      // Check if x and y are within the board's size
      // Check if there is a ship at x and y

      const isShipOnBoard = memo.some((cell) => cell.id === id && id !== undefined);
      if (isShipOnBoard) {
        for (let i = 0; i < memo.length; i += 1) {
          if (memo[i].id === id) {
            const { row, col } = memo[i];
            console.log(`row: ${row} | col: ${col}`);
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
        // board[x].fill(newShip, y, y + newShip.length);
        for (let i = y; i < y + newShip.length; i += 1) {
          board[x][i] = Cell(newShip);
          memo.push({ row: x, col: i, id });
        }
      }

      if (isRotating) {
        _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('rotate', true);
      } else {
        _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('drop', false, true);
      }
    } else if (isValidCoordinates && isDragging && !isRotating) {
      console.log('dragging');
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('drop', true, true);
    } else if (!isValidCoordinates && isDragging && !isRotating) {
      console.log(`there is a ship on or near coordinates`);
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('drop', true, false);
    } else if (!isValidCoordinates && !isDragging && isRotating) {
      console.log(`cannot rotate`);
      _pubSub__WEBPACK_IMPORTED_MODULE_1__["default"].publish('rotate', false);
    }
  };

  const placeShipsRandom = () => {
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    const coordinates = [];
    let i = 0;
    while (i < ships.length) {
      // generateRandomCoordinate()
      const [x, y] = generateRandomCoordinate();
      const shipCoordinates = generateShipCoordinates([x, y]);
      const isValidCoordinate = shipCoordinates.every(checkBoard);
      if (!coordinates.find(([a, b]) => a === x && b === y) && isValidCoordinate) {
        const orientation = Math.floor(Math.random() * 2) === 1;
        placeShip([x, y], ships[i], orientation, false, false, (0,_helpers_generateUUID__WEBPACK_IMPORTED_MODULE_2__["default"])());
        coordinates.push([x, y]);
        console.log(ships[i]);
        i += 1;
      } else {
        continue;
      }
    }
    console.log(coordinates);
    console.log(board);
    // placeShip(coordinates, shipLength, orientation, isDragging, isRotate, id)
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
    placeShipsRandom,
    getStatus,
    getBoardCell,
    clearBoard,
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
/* harmony import */ var _helpers_generateUUID__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../helpers/generateUUID */ "./src/helpers/generateUUID.js");
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
module.exports = __webpack_require__.p + "040f5ee6b57564bdd2fc.svg";

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__("./src/app.js"));
/******/ }
]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsbUJBQW1CO0FBQzVFOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsa0JBQWtCO0FBQ2pDLGVBQWUsUUFBUTtBQUN2QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVB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ZXMiOlsid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvQGljb25mdS9zdmctaW5qZWN0L2Rpc3Qvc3ZnLWluamVjdC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaGVhZGVyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9ob21lLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9uYXZiYXIuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3BvcnQuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvZ2V0VXJsLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5jc3M/YTY3MiIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9oZWFkZXIuY3NzP2U2OGIiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaG9tZS5jc3M/NGI1MSIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9uYXZiYXIuY3NzP2MxZGIiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbm90aWZpY2F0aW9ucy5jc3M/MmQyZCIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9wb3J0LmNzcz8zNGVmIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzPzM0MWUiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL2hlYWRlci5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9oZWFkZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9uYXZiYXIvbmF2YmFyLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25hdmJhci9uYXZiYXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvbWFpbi9tYWluLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvbWFpbi9tYWluLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vY29tcG9zZUdhbWUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3NjcmVlbi9wbGF5R2FtZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvc2NyZWVuL3BvcnQuY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vc2NyZWVuQ29udHJvbGxlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvZ2FtZUNvbnRyb2xsZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2dhbWVib2FyZC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvaXNDb21wdXRlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvaXNIdW1hbi5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcGlwZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcGxheWVyLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9wdWJTdWIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3NoaXAuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9oZWxwZXJzL2dlbmVyYXRlVVVJRC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFNWR0luamVjdCAtIFZlcnNpb24gMS4yLjNcbiAqIEEgdGlueSwgaW50dWl0aXZlLCByb2J1c3QsIGNhY2hpbmcgc29sdXRpb24gZm9yIGluamVjdGluZyBTVkcgZmlsZXMgaW5saW5lIGludG8gdGhlIERPTS5cbiAqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaWNvbmZ1L3N2Zy1pbmplY3RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTggSU5DT1JTLCB0aGUgY3JlYXRvcnMgb2YgaWNvbmZ1LmNvbVxuICogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgLSBodHRwczovL2dpdGh1Yi5jb20vaWNvbmZ1L3N2Zy1pbmplY3QvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbihmdW5jdGlvbih3aW5kb3csIGRvY3VtZW50KSB7XG4gIC8vIGNvbnN0YW50cyBmb3IgYmV0dGVyIG1pbmlmaWNhdGlvblxuICB2YXIgX0NSRUFURV9FTEVNRU5UXyA9ICdjcmVhdGVFbGVtZW50JztcbiAgdmFyIF9HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfID0gJ2dldEVsZW1lbnRzQnlUYWdOYW1lJztcbiAgdmFyIF9MRU5HVEhfID0gJ2xlbmd0aCc7XG4gIHZhciBfU1RZTEVfID0gJ3N0eWxlJztcbiAgdmFyIF9USVRMRV8gPSAndGl0bGUnO1xuICB2YXIgX1VOREVGSU5FRF8gPSAndW5kZWZpbmVkJztcbiAgdmFyIF9TRVRfQVRUUklCVVRFXyA9ICdzZXRBdHRyaWJ1dGUnO1xuICB2YXIgX0dFVF9BVFRSSUJVVEVfID0gJ2dldEF0dHJpYnV0ZSc7XG5cbiAgdmFyIE5VTEwgPSBudWxsO1xuXG4gIC8vIGNvbnN0YW50c1xuICB2YXIgX19TVkdJTkpFQ1QgPSAnX19zdmdJbmplY3QnO1xuICB2YXIgSURfU1VGRklYID0gJy0taW5qZWN0LSc7XG4gIHZhciBJRF9TVUZGSVhfUkVHRVggPSBuZXcgUmVnRXhwKElEX1NVRkZJWCArICdcXFxcZCsnLCBcImdcIik7XG4gIHZhciBMT0FEX0ZBSUwgPSAnTE9BRF9GQUlMJztcbiAgdmFyIFNWR19OT1RfU1VQUE9SVEVEID0gJ1NWR19OT1RfU1VQUE9SVEVEJztcbiAgdmFyIFNWR19JTlZBTElEID0gJ1NWR19JTlZBTElEJztcbiAgdmFyIEFUVFJJQlVURV9FWENMVVNJT05fTkFNRVMgPSBbJ3NyYycsICdhbHQnLCAnb25sb2FkJywgJ29uZXJyb3InXTtcbiAgdmFyIEFfRUxFTUVOVCA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF9dKCdhJyk7XG4gIHZhciBJU19TVkdfU1VQUE9SVEVEID0gdHlwZW9mIFNWR1JlY3QgIT0gX1VOREVGSU5FRF87XG4gIHZhciBERUZBVUxUX09QVElPTlMgPSB7XG4gICAgdXNlQ2FjaGU6IHRydWUsXG4gICAgY29weUF0dHJpYnV0ZXM6IHRydWUsXG4gICAgbWFrZUlkc1VuaXF1ZTogdHJ1ZVxuICB9O1xuICAvLyBNYXAgb2YgSVJJIHJlZmVyZW5jZWFibGUgdGFnIG5hbWVzIHRvIHByb3BlcnRpZXMgdGhhdCBjYW4gcmVmZXJlbmNlIHRoZW0uIFRoaXMgaXMgZGVmaW5lZCBpblxuICAvLyBodHRwczovL3d3dy53My5vcmcvVFIvU1ZHMTEvbGlua2luZy5odG1sI3Byb2Nlc3NpbmdJUklcbiAgdmFyIElSSV9UQUdfUFJPUEVSVElFU19NQVAgPSB7XG4gICAgY2xpcFBhdGg6IFsnY2xpcC1wYXRoJ10sXG4gICAgJ2NvbG9yLXByb2ZpbGUnOiBOVUxMLFxuICAgIGN1cnNvcjogTlVMTCxcbiAgICBmaWx0ZXI6IE5VTEwsXG4gICAgbGluZWFyR3JhZGllbnQ6IFsnZmlsbCcsICdzdHJva2UnXSxcbiAgICBtYXJrZXI6IFsnbWFya2VyJywgJ21hcmtlci1lbmQnLCAnbWFya2VyLW1pZCcsICdtYXJrZXItc3RhcnQnXSxcbiAgICBtYXNrOiBOVUxMLFxuICAgIHBhdHRlcm46IFsnZmlsbCcsICdzdHJva2UnXSxcbiAgICByYWRpYWxHcmFkaWVudDogWydmaWxsJywgJ3N0cm9rZSddXG4gIH07XG4gIHZhciBJTkpFQ1RFRCA9IDE7XG4gIHZhciBGQUlMID0gMjtcblxuICB2YXIgdW5pcXVlSWRDb3VudGVyID0gMTtcbiAgdmFyIHhtbFNlcmlhbGl6ZXI7XG4gIHZhciBkb21QYXJzZXI7XG5cblxuICAvLyBjcmVhdGVzIGFuIFNWRyBkb2N1bWVudCBmcm9tIGFuIFNWRyBzdHJpbmdcbiAgZnVuY3Rpb24gc3ZnU3RyaW5nVG9TdmdEb2Moc3ZnU3RyKSB7XG4gICAgZG9tUGFyc2VyID0gZG9tUGFyc2VyIHx8IG5ldyBET01QYXJzZXIoKTtcbiAgICByZXR1cm4gZG9tUGFyc2VyLnBhcnNlRnJvbVN0cmluZyhzdmdTdHIsICd0ZXh0L3htbCcpO1xuICB9XG5cblxuICAvLyBzZWFyaWFsaXplcyBhbiBTVkcgZWxlbWVudCB0byBhbiBTVkcgc3RyaW5nXG4gIGZ1bmN0aW9uIHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtZW50KSB7XG4gICAgeG1sU2VyaWFsaXplciA9IHhtbFNlcmlhbGl6ZXIgfHwgbmV3IFhNTFNlcmlhbGl6ZXIoKTtcbiAgICByZXR1cm4geG1sU2VyaWFsaXplci5zZXJpYWxpemVUb1N0cmluZyhzdmdFbGVtZW50KTtcbiAgfVxuXG5cbiAgLy8gUmV0dXJucyB0aGUgYWJzb2x1dGUgdXJsIGZvciB0aGUgc3BlY2lmaWVkIHVybFxuICBmdW5jdGlvbiBnZXRBYnNvbHV0ZVVybCh1cmwpIHtcbiAgICBBX0VMRU1FTlQuaHJlZiA9IHVybDtcbiAgICByZXR1cm4gQV9FTEVNRU5ULmhyZWY7XG4gIH1cblxuXG4gIC8vIExvYWQgc3ZnIHdpdGggYW4gWEhSIHJlcXVlc3RcbiAgZnVuY3Rpb24gbG9hZFN2Zyh1cmwsIGNhbGxiYWNrLCBlcnJvckNhbGxiYWNrKSB7XG4gICAgaWYgKHVybCkge1xuICAgICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCkge1xuICAgICAgICAgIC8vIHJlYWR5U3RhdGUgaXMgRE9ORVxuICAgICAgICAgIHZhciBzdGF0dXMgPSByZXEuc3RhdHVzO1xuICAgICAgICAgIGlmIChzdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyBpcyBPS1xuICAgICAgICAgICAgY2FsbGJhY2socmVxLnJlc3BvbnNlWE1MLCByZXEucmVzcG9uc2VUZXh0LnRyaW0oKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyBpcyBlcnJvciAoNHh4IG9yIDV4eClcbiAgICAgICAgICAgIGVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PSAwKSB7XG4gICAgICAgICAgICAvLyByZXF1ZXN0IHN0YXR1cyAwIGNhbiBpbmRpY2F0ZSBhIGZhaWxlZCBjcm9zcy1kb21haW4gY2FsbFxuICAgICAgICAgICAgZXJyb3JDYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgICAgcmVxLnNlbmQoKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIENvcHkgYXR0cmlidXRlcyBmcm9tIGltZyBlbGVtZW50IHRvIHN2ZyBlbGVtZW50XG4gIGZ1bmN0aW9uIGNvcHlBdHRyaWJ1dGVzKGltZ0VsZW0sIHN2Z0VsZW0pIHtcbiAgICB2YXIgYXR0cmlidXRlO1xuICAgIHZhciBhdHRyaWJ1dGVOYW1lO1xuICAgIHZhciBhdHRyaWJ1dGVWYWx1ZTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGltZ0VsZW0uYXR0cmlidXRlcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJpYnV0ZXNbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgIGF0dHJpYnV0ZSA9IGF0dHJpYnV0ZXNbaV07XG4gICAgICBhdHRyaWJ1dGVOYW1lID0gYXR0cmlidXRlLm5hbWU7XG4gICAgICAvLyBPbmx5IGNvcHkgYXR0cmlidXRlcyBub3QgZXhwbGljaXRseSBleGNsdWRlZCBmcm9tIGNvcHlpbmdcbiAgICAgIGlmIChBVFRSSUJVVEVfRVhDTFVTSU9OX05BTUVTLmluZGV4T2YoYXR0cmlidXRlTmFtZSkgPT0gLTEpIHtcbiAgICAgICAgYXR0cmlidXRlVmFsdWUgPSBhdHRyaWJ1dGUudmFsdWU7XG4gICAgICAgIC8vIElmIGltZyBhdHRyaWJ1dGUgaXMgXCJ0aXRsZVwiLCBpbnNlcnQgYSB0aXRsZSBlbGVtZW50IGludG8gU1ZHIGVsZW1lbnRcbiAgICAgICAgaWYgKGF0dHJpYnV0ZU5hbWUgPT0gX1RJVExFXykge1xuICAgICAgICAgIHZhciB0aXRsZUVsZW07XG4gICAgICAgICAgdmFyIGZpcnN0RWxlbWVudENoaWxkID0gc3ZnRWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICBpZiAoZmlyc3RFbGVtZW50Q2hpbGQgJiYgZmlyc3RFbGVtZW50Q2hpbGQubG9jYWxOYW1lLnRvTG93ZXJDYXNlKCkgPT0gX1RJVExFXykge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFNWRyBlbGVtZW50J3MgZmlyc3QgY2hpbGQgaXMgYSB0aXRsZSBlbGVtZW50LCBrZWVwIGl0IGFzIHRoZSB0aXRsZSBlbGVtZW50XG4gICAgICAgICAgICB0aXRsZUVsZW0gPSBmaXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFNWRyBlbGVtZW50J3MgZmlyc3QgY2hpbGQgZWxlbWVudCBpcyBub3QgYSB0aXRsZSBlbGVtZW50LCBjcmVhdGUgYSBuZXcgdGl0bGVcbiAgICAgICAgICAgIC8vIGVsZSxlbXQgYW5kIHNldCBpdCBhcyB0aGUgZmlyc3QgY2hpbGRcbiAgICAgICAgICAgIHRpdGxlRWxlbSA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF8gKyAnTlMnXSgnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCBfVElUTEVfKTtcbiAgICAgICAgICAgIHN2Z0VsZW0uaW5zZXJ0QmVmb3JlKHRpdGxlRWxlbSwgZmlyc3RFbGVtZW50Q2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTZXQgbmV3IHRpdGxlIGNvbnRlbnRcbiAgICAgICAgICB0aXRsZUVsZW0udGV4dENvbnRlbnQgPSBhdHRyaWJ1dGVWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBTZXQgaW1nIGF0dHJpYnV0ZSB0byBzdmcgZWxlbWVudFxuICAgICAgICAgIHN2Z0VsZW1bX1NFVF9BVFRSSUJVVEVfXShhdHRyaWJ1dGVOYW1lLCBhdHRyaWJ1dGVWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8vIFRoaXMgZnVuY3Rpb24gYXBwZW5kcyBhIHN1ZmZpeCB0byBJRHMgb2YgcmVmZXJlbmNlZCBlbGVtZW50cyBpbiB0aGUgPGRlZnM+IGluIG9yZGVyIHRvICB0byBhdm9pZCBJRCBjb2xsaXNpb25cbiAgLy8gYmV0d2VlbiBtdWx0aXBsZSBpbmplY3RlZCBTVkdzLiBUaGUgc3VmZml4IGhhcyB0aGUgZm9ybSBcIi0taW5qZWN0LVhcIiwgd2hlcmUgWCBpcyBhIHJ1bm5pbmcgbnVtYmVyIHdoaWNoIGlzXG4gIC8vIGluY3JlbWVudGVkIHdpdGggZWFjaCBpbmplY3Rpb24uIFJlZmVyZW5jZXMgdG8gdGhlIElEcyBhcmUgYWRqdXN0ZWQgYWNjb3JkaW5nbHkuXG4gIC8vIFdlIGFzc3VtZSB0aGEgYWxsIElEcyB3aXRoaW4gdGhlIGluamVjdGVkIFNWRyBhcmUgdW5pcXVlLCB0aGVyZWZvcmUgdGhlIHNhbWUgc3VmZml4IGNhbiBiZSB1c2VkIGZvciBhbGwgSURzIG9mIG9uZVxuICAvLyBpbmplY3RlZCBTVkcuXG4gIC8vIElmIHRoZSBvbmx5UmVmZXJlbmNlZCBhcmd1bWVudCBpcyBzZXQgdG8gdHJ1ZSwgb25seSB0aG9zZSBJRHMgd2lsbCBiZSBtYWRlIHVuaXF1ZSB0aGF0IGFyZSByZWZlcmVuY2VkIGZyb20gd2l0aGluIHRoZSBTVkdcbiAgZnVuY3Rpb24gbWFrZUlkc1VuaXF1ZShzdmdFbGVtLCBvbmx5UmVmZXJlbmNlZCkge1xuICAgIHZhciBpZFN1ZmZpeCA9IElEX1NVRkZJWCArIHVuaXF1ZUlkQ291bnRlcisrO1xuICAgIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbiBmb3IgZnVuY3Rpb25hbCBub3RhdGlvbnMgb2YgYW4gSVJJIHJlZmVyZW5jZXMuIFRoaXMgd2lsbCBmaW5kIG9jY3VyZW5jZXMgaW4gdGhlIGZvcm1cbiAgICAvLyB1cmwoI2FueUlkKSBvciB1cmwoXCIjYW55SWRcIikgKGZvciBJbnRlcm5ldCBFeHBsb3JlcikgYW5kIGNhcHR1cmUgdGhlIHJlZmVyZW5jZWQgSURcbiAgICB2YXIgZnVuY0lyaVJlZ2V4ID0gL3VybFxcKFwiPyMoW2EtekEtWl1bXFx3Oi4tXSopXCI/XFwpL2c7XG4gICAgLy8gR2V0IGFsbCBlbGVtZW50cyB3aXRoIGFuIElELiBUaGUgU1ZHIHNwZWMgcmVjb21tZW5kcyB0byBwdXQgcmVmZXJlbmNlZCBlbGVtZW50cyBpbnNpZGUgPGRlZnM+IGVsZW1lbnRzLCBidXRcbiAgICAvLyB0aGlzIGlzIG5vdCBhIHJlcXVpcmVtZW50LCB0aGVyZWZvcmUgd2UgaGF2ZSB0byBzZWFyY2ggZm9yIElEcyBpbiB0aGUgd2hvbGUgU1ZHLlxuICAgIHZhciBpZEVsZW1lbnRzID0gc3ZnRWxlbS5xdWVyeVNlbGVjdG9yQWxsKCdbaWRdJyk7XG4gICAgdmFyIGlkRWxlbTtcbiAgICAvLyBBbiBvYmplY3QgY29udGFpbmluZyByZWZlcmVuY2VkIElEcyAgYXMga2V5cyBpcyB1c2VkIGlmIG9ubHkgcmVmZXJlbmNlZCBJRHMgc2hvdWxkIGJlIHVuaXF1aWZpZWQuXG4gICAgLy8gSWYgdGhpcyBvYmplY3QgZG9lcyBub3QgZXhpc3QsIGFsbCBJRHMgd2lsbCBiZSB1bmlxdWlmaWVkLlxuICAgIHZhciByZWZlcmVuY2VkSWRzID0gb25seVJlZmVyZW5jZWQgPyBbXSA6IE5VTEw7XG4gICAgdmFyIHRhZ05hbWU7XG4gICAgdmFyIGlyaVRhZ05hbWVzID0ge307XG4gICAgdmFyIGlyaVByb3BlcnRpZXMgPSBbXTtcbiAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgIHZhciBpLCBqO1xuXG4gICAgaWYgKGlkRWxlbWVudHNbX0xFTkdUSF9dKSB7XG4gICAgICAvLyBNYWtlIGFsbCBJRHMgdW5pcXVlIGJ5IGFkZGluZyB0aGUgSUQgc3VmZml4IGFuZCBjb2xsZWN0IGFsbCBlbmNvdW50ZXJlZCB0YWcgbmFtZXNcbiAgICAgIC8vIHRoYXQgYXJlIElSSSByZWZlcmVuY2VhYmxlIGZyb20gcHJvcGVyaXRpZXMuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgaWRFbGVtZW50c1tfTEVOR1RIX107IGkrKykge1xuICAgICAgICB0YWdOYW1lID0gaWRFbGVtZW50c1tpXS5sb2NhbE5hbWU7IC8vIFVzZSBub24tbmFtZXNwYWNlZCB0YWcgbmFtZVxuICAgICAgICAvLyBNYWtlIElEIHVuaXF1ZSBpZiB0YWcgbmFtZSBpcyBJUkkgcmVmZXJlbmNlYWJsZVxuICAgICAgICBpZiAodGFnTmFtZSBpbiBJUklfVEFHX1BST1BFUlRJRVNfTUFQKSB7XG4gICAgICAgICAgaXJpVGFnTmFtZXNbdGFnTmFtZV0gPSAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBHZXQgYWxsIHByb3BlcnRpZXMgdGhhdCBhcmUgbWFwcGVkIHRvIHRoZSBmb3VuZCBJUkkgcmVmZXJlbmNlYWJsZSB0YWdzXG4gICAgICBmb3IgKHRhZ05hbWUgaW4gaXJpVGFnTmFtZXMpIHtcbiAgICAgICAgKElSSV9UQUdfUFJPUEVSVElFU19NQVBbdGFnTmFtZV0gfHwgW3RhZ05hbWVdKS5mb3JFYWNoKGZ1bmN0aW9uIChtYXBwZWRQcm9wZXJ0eSkge1xuICAgICAgICAgIC8vIEFkZCBtYXBwZWQgcHJvcGVydGllcyB0byBhcnJheSBvZiBpcmkgcmVmZXJlbmNpbmcgcHJvcGVydGllcy5cbiAgICAgICAgICAvLyBVc2UgbGluZWFyIHNlYXJjaCBoZXJlIGJlY2F1c2UgdGhlIG51bWJlciBvZiBwb3NzaWJsZSBlbnRyaWVzIGlzIHZlcnkgc21hbGwgKG1heGltdW0gMTEpXG4gICAgICAgICAgaWYgKGlyaVByb3BlcnRpZXMuaW5kZXhPZihtYXBwZWRQcm9wZXJ0eSkgPCAwKSB7XG4gICAgICAgICAgICBpcmlQcm9wZXJ0aWVzLnB1c2gobWFwcGVkUHJvcGVydHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoaXJpUHJvcGVydGllc1tfTEVOR1RIX10pIHtcbiAgICAgICAgLy8gQWRkIFwic3R5bGVcIiB0byBwcm9wZXJ0aWVzLCBiZWNhdXNlIGl0IG1heSBjb250YWluIHJlZmVyZW5jZXMgaW4gdGhlIGZvcm0gJ3N0eWxlPVwiZmlsbDp1cmwoI215RmlsbClcIidcbiAgICAgICAgaXJpUHJvcGVydGllcy5wdXNoKF9TVFlMRV8pO1xuICAgICAgfVxuICAgICAgLy8gUnVuIHRocm91Z2ggYWxsIGVsZW1lbnRzIG9mIHRoZSBTVkcgYW5kIHJlcGxhY2UgSURzIGluIHJlZmVyZW5jZXMuXG4gICAgICAvLyBUbyBnZXQgYWxsIGRlc2NlbmRpbmcgZWxlbWVudHMsIGdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykgc2VlbXMgdG8gcGVyZm9ybSBmYXN0ZXIgdGhhbiBxdWVyeVNlbGVjdG9yQWxsKCcqJykuXG4gICAgICAvLyBTaW5jZSBzdmdFbGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykgZG9lcyBub3QgcmV0dXJuIHRoZSBzdmcgZWxlbWVudCBpdHNlbGYsIHdlIGhhdmUgdG8gaGFuZGxlIGl0IHNlcGFyYXRlbHkuXG4gICAgICB2YXIgZGVzY0VsZW1lbnRzID0gc3ZnRWxlbVtfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FX10oJyonKTtcbiAgICAgIHZhciBlbGVtZW50ID0gc3ZnRWxlbTtcbiAgICAgIHZhciBwcm9wZXJ0eU5hbWU7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgbmV3VmFsdWU7XG4gICAgICBmb3IgKGkgPSAtMTsgZWxlbWVudCAhPSBOVUxMOykge1xuICAgICAgICBpZiAoZWxlbWVudC5sb2NhbE5hbWUgPT0gX1NUWUxFXykge1xuICAgICAgICAgIC8vIElmIGVsZW1lbnQgaXMgYSBzdHlsZSBlbGVtZW50LCByZXBsYWNlIElEcyBpbiBhbGwgb2NjdXJlbmNlcyBvZiBcInVybCgjYW55SWQpXCIgaW4gdGV4dCBjb250ZW50XG4gICAgICAgICAgdmFsdWUgPSBlbGVtZW50LnRleHRDb250ZW50O1xuICAgICAgICAgIG5ld1ZhbHVlID0gdmFsdWUgJiYgdmFsdWUucmVwbGFjZShmdW5jSXJpUmVnZXgsIGZ1bmN0aW9uKG1hdGNoLCBpZCkge1xuICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgcmVmZXJlbmNlZElkc1tpZF0gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICd1cmwoIycgKyBpZCArIGlkU3VmZml4ICsgJyknO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIGVsZW1lbnQudGV4dENvbnRlbnQgPSBuZXdWYWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgICAvLyBSdW4gdGhyb3VnaCBhbGwgcHJvcGVydHkgbmFtZXMgZm9yIHdoaWNoIElEcyB3ZXJlIGZvdW5kXG4gICAgICAgICAgZm9yIChqID0gMDsgaiA8IGlyaVByb3BlcnRpZXNbX0xFTkdUSF9dOyBqKyspIHtcbiAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IGlyaVByb3BlcnRpZXNbal07XG4gICAgICAgICAgICB2YWx1ZSA9IGVsZW1lbnRbX0dFVF9BVFRSSUJVVEVfXShwcm9wZXJ0eU5hbWUpO1xuICAgICAgICAgICAgbmV3VmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS5yZXBsYWNlKGZ1bmNJcmlSZWdleCwgZnVuY3Rpb24obWF0Y2gsIGlkKSB7XG4gICAgICAgICAgICAgIGlmIChyZWZlcmVuY2VkSWRzKSB7XG4gICAgICAgICAgICAgICAgcmVmZXJlbmNlZElkc1tpZF0gPSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICd1cmwoIycgKyBpZCArIGlkU3VmZml4ICsgJyknO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRbX1NFVF9BVFRSSUJVVEVfXShwcm9wZXJ0eU5hbWUsIG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVwbGFjZSBJRHMgaW4geGxpbms6cmVmIGFuZCBocmVmIGF0dHJpYnV0ZXNcbiAgICAgICAgICBbJ3hsaW5rOmhyZWYnLCAnaHJlZiddLmZvckVhY2goZnVuY3Rpb24ocmVmQXR0ck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpcmkgPSBlbGVtZW50W19HRVRfQVRUUklCVVRFX10ocmVmQXR0ck5hbWUpO1xuICAgICAgICAgICAgaWYgKC9eXFxzKiMvLnRlc3QoaXJpKSkgeyAvLyBDaGVjayBpZiBpcmkgaXMgbm9uLW51bGwgYW5kIGludGVybmFsIHJlZmVyZW5jZVxuICAgICAgICAgICAgICBpcmkgPSBpcmkudHJpbSgpO1xuICAgICAgICAgICAgICBlbGVtZW50W19TRVRfQVRUUklCVVRFX10ocmVmQXR0ck5hbWUsIGlyaSArIGlkU3VmZml4KTtcbiAgICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgSUQgdG8gcmVmZXJlbmNlZCBJRHNcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VkSWRzW2lyaS5zdWJzdHJpbmcoMSldID0gMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQgPSBkZXNjRWxlbWVudHNbKytpXTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpZEVsZW1lbnRzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICAgIGlkRWxlbSA9IGlkRWxlbWVudHNbaV07XG4gICAgICAgIC8vIElmIHNldCBvZiByZWZlcmVuY2VkIElEcyBleGlzdHMsIG1ha2Ugb25seSByZWZlcmVuY2VkIElEcyB1bmlxdWUsXG4gICAgICAgIC8vIG90aGVyd2lzZSBtYWtlIGFsbCBJRHMgdW5pcXVlLlxuICAgICAgICBpZiAoIXJlZmVyZW5jZWRJZHMgfHwgcmVmZXJlbmNlZElkc1tpZEVsZW0uaWRdKSB7XG4gICAgICAgICAgLy8gQWRkIHN1ZmZpeCB0byBlbGVtZW50J3MgSURcbiAgICAgICAgICBpZEVsZW0uaWQgKz0gaWRTdWZmaXg7XG4gICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmV0dXJuIHRydWUgaWYgU1ZHIGVsZW1lbnQgaGFzIGNoYW5nZWRcbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG5cbiAgLy8gRm9yIGNhY2hlZCBTVkdzIHRoZSBJRHMgYXJlIG1hZGUgdW5pcXVlIGJ5IHNpbXBseSByZXBsYWNpbmcgdGhlIGFscmVhZHkgaW5zZXJ0ZWQgdW5pcXVlIElEcyB3aXRoIGFcbiAgLy8gaGlnaGVyIElEIGNvdW50ZXIuIFRoaXMgaXMgbXVjaCBtb3JlIHBlcmZvcm1hbnQgdGhhbiBhIGNhbGwgdG8gbWFrZUlkc1VuaXF1ZSgpLlxuICBmdW5jdGlvbiBtYWtlSWRzVW5pcXVlQ2FjaGVkKHN2Z1N0cmluZykge1xuICAgIHJldHVybiBzdmdTdHJpbmcucmVwbGFjZShJRF9TVUZGSVhfUkVHRVgsIElEX1NVRkZJWCArIHVuaXF1ZUlkQ291bnRlcisrKTtcbiAgfVxuXG5cbiAgLy8gSW5qZWN0IFNWRyBieSByZXBsYWNpbmcgdGhlIGltZyBlbGVtZW50IHdpdGggdGhlIFNWRyBlbGVtZW50IGluIHRoZSBET01cbiAgZnVuY3Rpb24gaW5qZWN0KGltZ0VsZW0sIHN2Z0VsZW0sIGFic1VybCwgb3B0aW9ucykge1xuICAgIGlmIChzdmdFbGVtKSB7XG4gICAgICBzdmdFbGVtW19TRVRfQVRUUklCVVRFX10oJ2RhdGEtaW5qZWN0LXVybCcsIGFic1VybCk7XG4gICAgICB2YXIgcGFyZW50Tm9kZSA9IGltZ0VsZW0ucGFyZW50Tm9kZTtcbiAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNvcHlBdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgY29weUF0dHJpYnV0ZXMoaW1nRWxlbSwgc3ZnRWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSW52b2tlIGJlZm9yZUluamVjdCBob29rIGlmIHNldFxuICAgICAgICB2YXIgYmVmb3JlSW5qZWN0ID0gb3B0aW9ucy5iZWZvcmVJbmplY3Q7XG4gICAgICAgIHZhciBpbmplY3RFbGVtID0gKGJlZm9yZUluamVjdCAmJiBiZWZvcmVJbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSkpIHx8IHN2Z0VsZW07XG4gICAgICAgIC8vIFJlcGxhY2UgaW1nIGVsZW1lbnQgd2l0aCBuZXcgZWxlbWVudC4gVGhpcyBpcyB0aGUgYWN0dWFsIGluamVjdGlvbi5cbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoaW5qZWN0RWxlbSwgaW1nRWxlbSk7XG4gICAgICAgIC8vIE1hcmsgaW1nIGVsZW1lbnQgYXMgaW5qZWN0ZWRcbiAgICAgICAgaW1nRWxlbVtfX1NWR0lOSkVDVF0gPSBJTkpFQ1RFRDtcbiAgICAgICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pO1xuICAgICAgICAvLyBJbnZva2UgYWZ0ZXJJbmplY3QgaG9vayBpZiBzZXRcbiAgICAgICAgdmFyIGFmdGVySW5qZWN0ID0gb3B0aW9ucy5hZnRlckluamVjdDtcbiAgICAgICAgaWYgKGFmdGVySW5qZWN0KSB7XG4gICAgICAgICAgYWZ0ZXJJbmplY3QoaW1nRWxlbSwgaW5qZWN0RWxlbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIE1lcmdlcyBhbnkgbnVtYmVyIG9mIG9wdGlvbnMgb2JqZWN0cyBpbnRvIGEgbmV3IG9iamVjdFxuICBmdW5jdGlvbiBtZXJnZU9wdGlvbnMoKSB7XG4gICAgdmFyIG1lcmdlZE9wdGlvbnMgPSB7fTtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAvLyBJdGVyYXRlIG92ZXIgYWxsIHNwZWNpZmllZCBvcHRpb25zIG9iamVjdHMgYW5kIGFkZCBhbGwgcHJvcGVydGllcyB0byB0aGUgbmV3IG9wdGlvbnMgb2JqZWN0XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICB2YXIgYXJndW1lbnQgPSBhcmdzW2ldO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnQpIHtcbiAgICAgICAgICBpZiAoYXJndW1lbnQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgbWVyZ2VkT3B0aW9uc1trZXldID0gYXJndW1lbnRba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICByZXR1cm4gbWVyZ2VkT3B0aW9ucztcbiAgfVxuXG5cbiAgLy8gQWRkcyB0aGUgc3BlY2lmaWVkIENTUyB0byB0aGUgZG9jdW1lbnQncyA8aGVhZD4gZWxlbWVudFxuICBmdW5jdGlvbiBhZGRTdHlsZVRvSGVhZChjc3MpIHtcbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50W19HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfXSgnaGVhZCcpWzBdO1xuICAgIGlmIChoZWFkKSB7XG4gICAgICB2YXIgc3R5bGUgPSBkb2N1bWVudFtfQ1JFQVRFX0VMRU1FTlRfXShfU1RZTEVfKTtcbiAgICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIEJ1aWxkcyBhbiBTVkcgZWxlbWVudCBmcm9tIHRoZSBzcGVjaWZpZWQgU1ZHIHN0cmluZ1xuICBmdW5jdGlvbiBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyLCB2ZXJpZnkpIHtcbiAgICBpZiAodmVyaWZ5KSB7XG4gICAgICB2YXIgc3ZnRG9jO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gUGFyc2UgdGhlIFNWRyBzdHJpbmcgd2l0aCBET01QYXJzZXJcbiAgICAgICAgc3ZnRG9jID0gc3ZnU3RyaW5nVG9TdmdEb2Moc3ZnU3RyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gTlVMTDtcbiAgICAgIH1cbiAgICAgIGlmIChzdmdEb2NbX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV9dKCdwYXJzZXJlcnJvcicpW19MRU5HVEhfXSkge1xuICAgICAgICAvLyBET01QYXJzZXIgZG9lcyBub3QgdGhyb3cgYW4gZXhjZXB0aW9uLCBidXQgaW5zdGVhZCBwdXRzIHBhcnNlcmVycm9yIHRhZ3MgaW4gdGhlIGRvY3VtZW50XG4gICAgICAgIHJldHVybiBOVUxMO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN2Z0RvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpdi5pbm5lckhUTUwgPSBzdmdTdHI7XG4gICAgICByZXR1cm4gZGl2LmZpcnN0RWxlbWVudENoaWxkO1xuICAgIH1cbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pIHtcbiAgICAvLyBSZW1vdmUgdGhlIG9ubG9hZCBhdHRyaWJ1dGUuIFNob3VsZCBvbmx5IGJlIHVzZWQgdG8gcmVtb3ZlIHRoZSB1bnN0eWxlZCBpbWFnZSBmbGFzaCBwcm90ZWN0aW9uIGFuZFxuICAgIC8vIG1ha2UgdGhlIGVsZW1lbnQgdmlzaWJsZSwgbm90IGZvciByZW1vdmluZyB0aGUgZXZlbnQgbGlzdGVuZXIuXG4gICAgaW1nRWxlbS5yZW1vdmVBdHRyaWJ1dGUoJ29ubG9hZCcpO1xuICB9XG5cblxuICBmdW5jdGlvbiBlcnJvck1lc3NhZ2UobXNnKSB7XG4gICAgY29uc29sZS5lcnJvcignU1ZHSW5qZWN0OiAnICsgbXNnKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZmFpbChpbWdFbGVtLCBzdGF0dXMsIG9wdGlvbnMpIHtcbiAgICBpbWdFbGVtW19fU1ZHSU5KRUNUXSA9IEZBSUw7XG4gICAgaWYgKG9wdGlvbnMub25GYWlsKSB7XG4gICAgICBvcHRpb25zLm9uRmFpbChpbWdFbGVtLCBzdGF0dXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvck1lc3NhZ2Uoc3RhdHVzKTtcbiAgICB9XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucykge1xuICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWdFbGVtKTtcbiAgICBmYWlsKGltZ0VsZW0sIFNWR19JTlZBTElELCBvcHRpb25zKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3ZnTm90U3VwcG9ydGVkKGltZ0VsZW0sIG9wdGlvbnMpIHtcbiAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSk7XG4gICAgZmFpbChpbWdFbGVtLCBTVkdfTk9UX1NVUFBPUlRFRCwgb3B0aW9ucyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpIHtcbiAgICBmYWlsKGltZ0VsZW0sIExPQURfRkFJTCwgb3B0aW9ucyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZ0VsZW0pIHtcbiAgICBpbWdFbGVtLm9ubG9hZCA9IE5VTEw7XG4gICAgaW1nRWxlbS5vbmVycm9yID0gTlVMTDtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gaW1nTm90U2V0KG1zZykge1xuICAgIGVycm9yTWVzc2FnZSgnbm8gaW1nIGVsZW1lbnQnKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gY3JlYXRlU1ZHSW5qZWN0KGdsb2JhbE5hbWUsIG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoREVGQVVMVF9PUFRJT05TLCBvcHRpb25zKTtcbiAgICB2YXIgc3ZnTG9hZENhY2hlID0ge307XG5cbiAgICBpZiAoSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgLy8gSWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgU1ZHLCBhZGQgYSBzbWFsbCBzdHlsZXNoZWV0IHRoYXQgaGlkZXMgdGhlIDxpbWc+IGVsZW1lbnRzIHVudGlsXG4gICAgICAvLyBpbmplY3Rpb24gaXMgZmluaXNoZWQuIFRoaXMgYXZvaWRzIHNob3dpbmcgdGhlIHVuc3R5bGVkIFNWR3MgYmVmb3JlIHN0eWxlIGlzIGFwcGxpZWQuXG4gICAgICBhZGRTdHlsZVRvSGVhZCgnaW1nW29ubG9hZF49XCInICsgZ2xvYmFsTmFtZSArICcoXCJde3Zpc2liaWxpdHk6aGlkZGVuO30nKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNWR0luamVjdFxuICAgICAqXG4gICAgICogSW5qZWN0cyB0aGUgU1ZHIHNwZWNpZmllZCBpbiB0aGUgYHNyY2AgYXR0cmlidXRlIG9mIHRoZSBzcGVjaWZpZWQgYGltZ2AgZWxlbWVudCBvciBhcnJheSBvZiBgaW1nYFxuICAgICAqIGVsZW1lbnRzLiBSZXR1cm5zIGEgUHJvbWlzZSBvYmplY3Qgd2hpY2ggcmVzb2x2ZXMgaWYgYWxsIHBhc3NlZCBpbiBgaW1nYCBlbGVtZW50cyBoYXZlIGVpdGhlciBiZWVuXG4gICAgICogaW5qZWN0ZWQgb3IgZmFpbGVkIHRvIGluamVjdCAoT25seSBpZiBhIGdsb2JhbCBQcm9taXNlIG9iamVjdCBpcyBhdmFpbGFibGUgbGlrZSBpbiBhbGwgbW9kZXJuIGJyb3dzZXJzXG4gICAgICogb3IgdGhyb3VnaCBhIHBvbHlmaWxsKS5cbiAgICAgKlxuICAgICAqIE9wdGlvbnM6XG4gICAgICogdXNlQ2FjaGU6IElmIHNldCB0byBgdHJ1ZWAgdGhlIFNWRyB3aWxsIGJlIGNhY2hlZCB1c2luZyB0aGUgYWJzb2x1dGUgVVJMLiBEZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC5cbiAgICAgKiBjb3B5QXR0cmlidXRlczogSWYgc2V0IHRvIGB0cnVlYCB0aGUgYXR0cmlidXRlcyB3aWxsIGJlIGNvcGllZCBmcm9tIGBpbWdgIHRvIGBzdmdgLiBEZmF1bHQgdmFsdWVcbiAgICAgKiAgICAgaXMgYHRydWVgLlxuICAgICAqIG1ha2VJZHNVbmlxdWU6IElmIHNldCB0byBgdHJ1ZWAgdGhlIElEIG9mIGVsZW1lbnRzIGluIHRoZSBgPGRlZnM+YCBlbGVtZW50IHRoYXQgY2FuIGJlIHJlZmVyZW5jZXMgYnlcbiAgICAgKiAgICAgcHJvcGVydHkgdmFsdWVzIChmb3IgZXhhbXBsZSAnY2xpcFBhdGgnKSBhcmUgbWFkZSB1bmlxdWUgYnkgYXBwZW5kaW5nIFwiLS1pbmplY3QtWFwiLCB3aGVyZSBYIGlzIGFcbiAgICAgKiAgICAgcnVubmluZyBudW1iZXIgd2hpY2ggaW5jcmVhc2VzIHdpdGggZWFjaCBpbmplY3Rpb24uIFRoaXMgaXMgZG9uZSB0byBhdm9pZCBkdXBsaWNhdGUgSURzIGluIHRoZSBET00uXG4gICAgICogYmVmb3JlTG9hZDogSG9vayBiZWZvcmUgU1ZHIGlzIGxvYWRlZC4gVGhlIGBpbWdgIGVsZW1lbnQgaXMgcGFzc2VkIGFzIGEgcGFyYW1ldGVyLiBJZiB0aGUgaG9vayByZXR1cm5zXG4gICAgICogICAgIGEgc3RyaW5nIGl0IGlzIHVzZWQgYXMgdGhlIFVSTCBpbnN0ZWFkIG9mIHRoZSBgaW1nYCBlbGVtZW50J3MgYHNyY2AgYXR0cmlidXRlLlxuICAgICAqIGFmdGVyTG9hZDogSG9vayBhZnRlciBTVkcgaXMgbG9hZGVkLiBUaGUgbG9hZGVkIGBzdmdgIGVsZW1lbnQgYW5kIGBzdmdgIHN0cmluZyBhcmUgcGFzc2VkIGFzIGFcbiAgICAgKiAgICAgcGFyYW1ldGVycy4gSWYgY2FjaGluZyBpcyBhY3RpdmUgdGhpcyBob29rIHdpbGwgb25seSBnZXQgY2FsbGVkIG9uY2UgZm9yIGluamVjdGVkIFNWR3Mgd2l0aCB0aGVcbiAgICAgKiAgICAgc2FtZSBhYnNvbHV0ZSBwYXRoLiBDaGFuZ2VzIHRvIHRoZSBgc3ZnYCBlbGVtZW50IGluIHRoaXMgaG9vayB3aWxsIGJlIGFwcGxpZWQgdG8gYWxsIGluamVjdGVkIFNWR3NcbiAgICAgKiAgICAgd2l0aCB0aGUgc2FtZSBhYnNvbHV0ZSBwYXRoLiBJdCdzIGFsc28gcG9zc2libGUgdG8gcmV0dXJuIGFuIGBzdmdgIHN0cmluZyBvciBgc3ZnYCBlbGVtZW50IHdoaWNoXG4gICAgICogICAgIHdpbGwgdGhlbiBiZSB1c2VkIGZvciB0aGUgaW5qZWN0aW9uLlxuICAgICAqIGJlZm9yZUluamVjdDogSG9vayBiZWZvcmUgU1ZHIGlzIGluamVjdGVkLiBUaGUgYGltZ2AgYW5kIGBzdmdgIGVsZW1lbnRzIGFyZSBwYXNzZWQgYXMgcGFyYW1ldGVycy4gSWZcbiAgICAgKiAgICAgYW55IGh0bWwgZWxlbWVudCBpcyByZXR1cm5lZCBpdCBnZXRzIGluamVjdGVkIGluc3RlYWQgb2YgYXBwbHlpbmcgdGhlIGRlZmF1bHQgU1ZHIGluamVjdGlvbi5cbiAgICAgKiBhZnRlckluamVjdDogSG9vayBhZnRlciBTVkcgaXMgaW5qZWN0ZWQuIFRoZSBgaW1nYCBhbmQgYHN2Z2AgZWxlbWVudHMgYXJlIHBhc3NlZCBhcyBwYXJhbWV0ZXJzLlxuICAgICAqIG9uQWxsRmluaXNoOiBIb29rIGFmdGVyIGFsbCBgaW1nYCBlbGVtZW50cyBwYXNzZWQgdG8gYW4gU1ZHSW5qZWN0KCkgY2FsbCBoYXZlIGVpdGhlciBiZWVuIGluamVjdGVkIG9yXG4gICAgICogICAgIGZhaWxlZCB0byBpbmplY3QuXG4gICAgICogb25GYWlsOiBIb29rIGFmdGVyIGluamVjdGlvbiBmYWlscy4gVGhlIGBpbWdgIGVsZW1lbnQgYW5kIGEgYHN0YXR1c2Agc3RyaW5nIGFyZSBwYXNzZWQgYXMgYW4gcGFyYW1ldGVyLlxuICAgICAqICAgICBUaGUgYHN0YXR1c2AgY2FuIGJlIGVpdGhlciBgJ1NWR19OT1RfU1VQUE9SVEVEJ2AgKHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgU1ZHKSxcbiAgICAgKiAgICAgYCdTVkdfSU5WQUxJRCdgICh0aGUgU1ZHIGlzIG5vdCBpbiBhIHZhbGlkIGZvcm1hdCkgb3IgYCdMT0FEX0ZBSUxFRCdgIChsb2FkaW5nIG9mIHRoZSBTVkcgZmFpbGVkKS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEltYWdlRWxlbWVudH0gaW1nIC0gYW4gaW1nIGVsZW1lbnQgb3IgYW4gYXJyYXkgb2YgaW1nIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIG9wdGlvbmFsIHBhcmFtZXRlciB3aXRoIFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIHRoaXMgaW5qZWN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNWR0luamVjdChpbWcsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgICB2YXIgcnVuID0gZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICB2YXIgYWxsRmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIG9uQWxsRmluaXNoID0gb3B0aW9ucy5vbkFsbEZpbmlzaDtcbiAgICAgICAgICBpZiAob25BbGxGaW5pc2gpIHtcbiAgICAgICAgICAgIG9uQWxsRmluaXNoKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUgJiYgcmVzb2x2ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChpbWcgJiYgdHlwZW9mIGltZ1tfTEVOR1RIX10gIT0gX1VOREVGSU5FRF8pIHtcbiAgICAgICAgICAvLyBhbiBhcnJheSBsaWtlIHN0cnVjdHVyZSBvZiBpbWcgZWxlbWVudHNcbiAgICAgICAgICB2YXIgaW5qZWN0SW5kZXggPSAwO1xuICAgICAgICAgIHZhciBpbmplY3RDb3VudCA9IGltZ1tfTEVOR1RIX107XG5cbiAgICAgICAgICBpZiAoaW5qZWN0Q291bnQgPT0gMCkge1xuICAgICAgICAgICAgYWxsRmluaXNoKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBmaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKCsraW5qZWN0SW5kZXggPT0gaW5qZWN0Q291bnQpIHtcbiAgICAgICAgICAgICAgICBhbGxGaW5pc2goKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmplY3RDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICAgIFNWR0luamVjdEVsZW1lbnQoaW1nW2ldLCBvcHRpb25zLCBmaW5pc2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvbmx5IG9uZSBpbWcgZWxlbWVudFxuICAgICAgICAgIFNWR0luamVjdEVsZW1lbnQoaW1nLCBvcHRpb25zLCBhbGxGaW5pc2gpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyByZXR1cm4gYSBQcm9taXNlIG9iamVjdCBpZiBnbG9iYWxseSBhdmFpbGFibGVcbiAgICAgIHJldHVybiB0eXBlb2YgUHJvbWlzZSA9PSBfVU5ERUZJTkVEXyA/IHJ1bigpIDogbmV3IFByb21pc2UocnVuKTtcbiAgICB9XG5cblxuICAgIC8vIEluamVjdHMgYSBzaW5nbGUgc3ZnIGVsZW1lbnQuIE9wdGlvbnMgbXVzdCBiZSBhbHJlYWR5IG1lcmdlZCB3aXRoIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAgZnVuY3Rpb24gU1ZHSW5qZWN0RWxlbWVudChpbWdFbGVtLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgaWYgKGltZ0VsZW0pIHtcbiAgICAgICAgdmFyIHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlID0gaW1nRWxlbVtfX1NWR0lOSkVDVF07XG4gICAgICAgIGlmICghc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUpIHtcbiAgICAgICAgICByZW1vdmVFdmVudExpc3RlbmVycyhpbWdFbGVtKTtcblxuICAgICAgICAgIGlmICghSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgICAgICAgc3ZnTm90U3VwcG9ydGVkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSW52b2tlIGJlZm9yZUxvYWQgaG9vayBpZiBzZXQuIElmIHRoZSBiZWZvcmVMb2FkIHJldHVybnMgYSB2YWx1ZSB1c2UgaXQgYXMgdGhlIHNyYyBmb3IgdGhlIGxvYWRcbiAgICAgICAgICAvLyBVUkwgcGF0aC4gRWxzZSB1c2UgdGhlIGltZ0VsZW0ncyBzcmMgYXR0cmlidXRlIHZhbHVlLlxuICAgICAgICAgIHZhciBiZWZvcmVMb2FkID0gb3B0aW9ucy5iZWZvcmVMb2FkO1xuICAgICAgICAgIHZhciBzcmMgPSAoYmVmb3JlTG9hZCAmJiBiZWZvcmVMb2FkKGltZ0VsZW0pKSB8fCBpbWdFbGVtW19HRVRfQVRUUklCVVRFX10oJ3NyYycpO1xuXG4gICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgIC8vIElmIG5vIGltYWdlIHNyYyBhdHRyaWJ1dGUgaXMgc2V0IGRvIG5vIGluamVjdGlvbi4gVGhpcyBjYW4gb25seSBiZSByZWFjaGVkIGJ5IHVzaW5nIGphdmFzY3JpcHRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaWYgbm8gc3JjIGF0dHJpYnV0ZSBpcyBzZXQgdGhlIG9ubG9hZCBhbmQgb25lcnJvciBldmVudHMgZG8gbm90IGdldCBjYWxsZWRcbiAgICAgICAgICAgIGlmIChzcmMgPT09ICcnKSB7XG4gICAgICAgICAgICAgIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBzZXQgYXJyYXkgc28gbGF0ZXIgY2FsbHMgY2FuIHJlZ2lzdGVyIGNhbGxiYWNrc1xuICAgICAgICAgIHZhciBvbkZpbmlzaENhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgIGltZ0VsZW1bX19TVkdJTkpFQ1RdID0gb25GaW5pc2hDYWxsYmFja3M7XG5cbiAgICAgICAgICB2YXIgb25GaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICBvbkZpbmlzaENhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKG9uRmluaXNoQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgb25GaW5pc2hDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHZhciBhYnNVcmwgPSBnZXRBYnNvbHV0ZVVybChzcmMpO1xuICAgICAgICAgIHZhciB1c2VDYWNoZU9wdGlvbiA9IG9wdGlvbnMudXNlQ2FjaGU7XG4gICAgICAgICAgdmFyIG1ha2VJZHNVbmlxdWVPcHRpb24gPSBvcHRpb25zLm1ha2VJZHNVbmlxdWU7XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIHNldFN2Z0xvYWRDYWNoZVZhbHVlID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FjaGVPcHRpb24pIHtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0uZm9yRWFjaChmdW5jdGlvbihzdmdMb2FkKSB7XG4gICAgICAgICAgICAgICAgc3ZnTG9hZCh2YWwpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0gPSB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmICh1c2VDYWNoZU9wdGlvbikge1xuICAgICAgICAgICAgdmFyIHN2Z0xvYWQgPSBzdmdMb2FkQ2FjaGVbYWJzVXJsXTtcblxuICAgICAgICAgICAgdmFyIGhhbmRsZUxvYWRWYWx1ZSA9IGZ1bmN0aW9uKGxvYWRWYWx1ZSkge1xuICAgICAgICAgICAgICBpZiAobG9hZFZhbHVlID09PSBMT0FEX0ZBSUwpIHtcbiAgICAgICAgICAgICAgICBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChsb2FkVmFsdWUgPT09IFNWR19JTlZBTElEKSB7XG4gICAgICAgICAgICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzVW5pcXVlSWRzID0gbG9hZFZhbHVlWzBdO1xuICAgICAgICAgICAgICAgIHZhciBzdmdTdHJpbmcgPSBsb2FkVmFsdWVbMV07XG4gICAgICAgICAgICAgICAgdmFyIHVuaXF1ZUlkc1N2Z1N0cmluZyA9IGxvYWRWYWx1ZVsyXTtcbiAgICAgICAgICAgICAgICB2YXIgc3ZnRWxlbTtcblxuICAgICAgICAgICAgICAgIGlmIChtYWtlSWRzVW5pcXVlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaGFzVW5pcXVlSWRzID09PSBOVUxMKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElEcyBmb3IgdGhlIFNWRyBzdHJpbmcgaGF2ZSBub3QgYmVlbiBtYWRlIHVuaXF1ZSBiZWZvcmUuIFRoaXMgbWF5IGhhcHBlbiBpZiBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAvLyBpbmplY3Rpb24gb2YgYSBjYWNoZWQgU1ZHIGhhdmUgYmVlbiBydW4gd2l0aCB0aGUgb3B0aW9uIG1ha2VkSWRzVW5pcXVlIHNldCB0byBmYWxzZVxuICAgICAgICAgICAgICAgICAgICBzdmdFbGVtID0gYnVpbGRTdmdFbGVtZW50KHN2Z1N0cmluZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBoYXNVbmlxdWVJZHMgPSBtYWtlSWRzVW5pcXVlKHN2Z0VsZW0sIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgICAgICBsb2FkVmFsdWVbMF0gPSBoYXNVbmlxdWVJZHM7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRWYWx1ZVsyXSA9IGhhc1VuaXF1ZUlkcyAmJiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1VuaXF1ZUlkcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIElEcyB1bmlxdWUgZm9yIGFscmVhZHkgY2FjaGVkIFNWR3Mgd2l0aCBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgICAgICAgICAgc3ZnU3RyaW5nID0gbWFrZUlkc1VuaXF1ZUNhY2hlZCh1bmlxdWVJZHNTdmdTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN2Z0VsZW0gPSBzdmdFbGVtIHx8IGJ1aWxkU3ZnRWxlbWVudChzdmdTdHJpbmcsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGluamVjdChpbWdFbGVtLCBzdmdFbGVtLCBhYnNVcmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHN2Z0xvYWQgIT0gX1VOREVGSU5FRF8pIHtcbiAgICAgICAgICAgICAgLy8gVmFsdWUgZm9yIHVybCBleGlzdHMgaW4gY2FjaGVcbiAgICAgICAgICAgICAgaWYgKHN2Z0xvYWQuaXNDYWxsYmFja1F1ZXVlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2FtZSB1cmwgaGFzIGJlZW4gY2FjaGVkLCBidXQgdmFsdWUgaGFzIG5vdCBiZWVuIGxvYWRlZCB5ZXQsIHNvIGFkZCB0byBjYWxsYmFja3NcbiAgICAgICAgICAgICAgICBzdmdMb2FkLnB1c2goaGFuZGxlTG9hZFZhbHVlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVMb2FkVmFsdWUoc3ZnTG9hZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHN2Z0xvYWQgPSBbXTtcbiAgICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5IGlzQ2FsbGJhY2tRdWV1ZSB0byBBcnJheSB0byBkaWZmZXJlbnRpYXRlIGZyb20gYXJyYXkgd2l0aCBjYWNoZWQgbG9hZGVkIHZhbHVlc1xuICAgICAgICAgICAgICBzdmdMb2FkLmlzQ2FsbGJhY2tRdWV1ZSA9IHRydWU7XG4gICAgICAgICAgICAgIHN2Z0xvYWRDYWNoZVthYnNVcmxdID0gc3ZnTG9hZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBMb2FkIHRoZSBTVkcgYmVjYXVzZSBpdCBpcyBub3QgY2FjaGVkIG9yIGNhY2hpbmcgaXMgZGlzYWJsZWRcbiAgICAgICAgICBsb2FkU3ZnKGFic1VybCwgZnVuY3Rpb24oc3ZnWG1sLCBzdmdTdHJpbmcpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgWE1MIGZyb20gdGhlIFhIUiByZXF1ZXN0IGlmIGl0IGlzIGFuIGluc3RhbmNlIG9mIERvY3VtZW50LiBPdGhlcndpc2VcbiAgICAgICAgICAgIC8vIChmb3IgZXhhbXBsZSBvZiBJRTkpLCBjcmVhdGUgdGhlIHN2ZyBkb2N1bWVudCBmcm9tIHRoZSBzdmcgc3RyaW5nLlxuICAgICAgICAgICAgdmFyIHN2Z0VsZW0gPSBzdmdYbWwgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHN2Z1htbC5kb2N1bWVudEVsZW1lbnQgOiBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyaW5nLCB0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGFmdGVyTG9hZCA9IG9wdGlvbnMuYWZ0ZXJMb2FkO1xuICAgICAgICAgICAgaWYgKGFmdGVyTG9hZCkge1xuICAgICAgICAgICAgICAvLyBJbnZva2UgYWZ0ZXJMb2FkIGhvb2sgd2hpY2ggbWF5IG1vZGlmeSB0aGUgU1ZHIGVsZW1lbnQuIEFmdGVyIGxvYWQgbWF5IGFsc28gcmV0dXJuIGEgbmV3XG4gICAgICAgICAgICAgIC8vIHN2ZyBlbGVtZW50IG9yIHN2ZyBzdHJpbmdcbiAgICAgICAgICAgICAgdmFyIHN2Z0VsZW1PclN2Z1N0cmluZyA9IGFmdGVyTG9hZChzdmdFbGVtLCBzdmdTdHJpbmcpIHx8IHN2Z0VsZW07XG4gICAgICAgICAgICAgIGlmIChzdmdFbGVtT3JTdmdTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgc3ZnRWxlbSBhbmQgc3ZnU3RyaW5nIGJlY2F1c2Ugb2YgbW9kaWZpY2F0aW9ucyB0byB0aGUgU1ZHIGVsZW1lbnQgb3IgU1ZHIHN0cmluZyBpblxuICAgICAgICAgICAgICAgIC8vIHRoZSBhZnRlckxvYWQgaG9vaywgc28gdGhlIG1vZGlmaWVkIFNWRyBpcyBhbHNvIHVzZWQgZm9yIGFsbCBsYXRlciBjYWNoZWQgaW5qZWN0aW9uc1xuICAgICAgICAgICAgICAgIHZhciBpc1N0cmluZyA9IHR5cGVvZiBzdmdFbGVtT3JTdmdTdHJpbmcgPT0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgc3ZnU3RyaW5nID0gaXNTdHJpbmcgPyBzdmdFbGVtT3JTdmdTdHJpbmcgOiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgc3ZnRWxlbSA9IGlzU3RyaW5nID8gYnVpbGRTdmdFbGVtZW50KHN2Z0VsZW1PclN2Z1N0cmluZywgdHJ1ZSkgOiBzdmdFbGVtT3JTdmdTdHJpbmc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN2Z0VsZW0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB7XG4gICAgICAgICAgICAgIHZhciBoYXNVbmlxdWVJZHMgPSBOVUxMO1xuICAgICAgICAgICAgICBpZiAobWFrZUlkc1VuaXF1ZU9wdGlvbikge1xuICAgICAgICAgICAgICAgIGhhc1VuaXF1ZUlkcyA9IG1ha2VJZHNVbmlxdWUoc3ZnRWxlbSwgZmFsc2UpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHVzZUNhY2hlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVuaXF1ZUlkc1N2Z1N0cmluZyA9IGhhc1VuaXF1ZUlkcyAmJiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbSk7XG4gICAgICAgICAgICAgICAgLy8gc2V0IGFuIGFycmF5IHdpdGggdGhyZWUgZW50cmllcyB0byB0aGUgbG9hZCBjYWNoZVxuICAgICAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKFtoYXNVbmlxdWVJZHMsIHN2Z1N0cmluZywgdW5pcXVlSWRzU3ZnU3RyaW5nXSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSwgYWJzVXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKFNWR19JTlZBTElEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIHNldFN2Z0xvYWRDYWNoZVZhbHVlKExPQURfRkFJTCk7XG4gICAgICAgICAgICBvbkZpbmlzaCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlKSkge1xuICAgICAgICAgICAgLy8gc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUgaXMgYW4gYXJyYXkuIEluamVjdGlvbiBpcyBub3QgY29tcGxldGUgc28gcmVnaXN0ZXIgY2FsbGJhY2tcbiAgICAgICAgICAgIHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW1nTm90U2V0KCk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBkZWZhdWx0IFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIFNWR0luamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBkZWZhdWx0IFtvcHRpb25zXSgjb3B0aW9ucykgZm9yIGFuIGluamVjdGlvbi5cbiAgICAgKi9cbiAgICBTVkdJbmplY3Quc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIGRlZmF1bHRPcHRpb25zID0gbWVyZ2VPcHRpb25zKGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKTtcbiAgICB9O1xuXG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgU1ZHSW5qZWN0XG4gICAgU1ZHSW5qZWN0LmNyZWF0ZSA9IGNyZWF0ZVNWR0luamVjdDtcblxuXG4gICAgLyoqXG4gICAgICogVXNlZCBpbiBvbmVycm9yIEV2ZW50IG9mIGFuIGA8aW1nPmAgZWxlbWVudCB0byBoYW5kbGUgY2FzZXMgd2hlbiB0aGUgbG9hZGluZyB0aGUgb3JpZ2luYWwgc3JjIGZhaWxzXG4gICAgICogKGZvciBleGFtcGxlIGlmIGZpbGUgaXMgbm90IGZvdW5kIG9yIGlmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgU1ZHKS4gVGhpcyB0cmlnZ2VycyBhIGNhbGwgdG8gdGhlXG4gICAgICogb3B0aW9ucyBvbkZhaWwgaG9vayBpZiBhdmFpbGFibGUuIFRoZSBvcHRpb25hbCBzZWNvbmQgcGFyYW1ldGVyIHdpbGwgYmUgc2V0IGFzIHRoZSBuZXcgc3JjIGF0dHJpYnV0ZVxuICAgICAqIGZvciB0aGUgaW1nIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxJbWFnZUVsZW1lbnR9IGltZyAtIGFuIGltZyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtmYWxsYmFja1NyY10gLSBvcHRpb25hbCBwYXJhbWV0ZXIgZmFsbGJhY2sgc3JjXG4gICAgICovXG4gICAgU1ZHSW5qZWN0LmVyciA9IGZ1bmN0aW9uKGltZywgZmFsbGJhY2tTcmMpIHtcbiAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgaWYgKGltZ1tfX1NWR0lOSkVDVF0gIT0gRkFJTCkge1xuICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZyk7XG5cbiAgICAgICAgICBpZiAoIUlTX1NWR19TVVBQT1JURUQpIHtcbiAgICAgICAgICAgIHN2Z05vdFN1cHBvcnRlZChpbWcsIGRlZmF1bHRPcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZyk7XG4gICAgICAgICAgICBsb2FkRmFpbChpbWcsIGRlZmF1bHRPcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZhbGxiYWNrU3JjKSB7XG4gICAgICAgICAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nKTtcbiAgICAgICAgICAgIGltZy5zcmMgPSBmYWxsYmFja1NyYztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGltZ05vdFNldCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3dbZ2xvYmFsTmFtZV0gPSBTVkdJbmplY3Q7XG5cbiAgICByZXR1cm4gU1ZHSW5qZWN0O1xuICB9XG5cbiAgdmFyIFNWR0luamVjdEluc3RhbmNlID0gY3JlYXRlU1ZHSW5qZWN0KCdTVkdJbmplY3QnKTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNWR0luamVjdEluc3RhbmNlO1xuICB9XG59KSh3aW5kb3csIGRvY3VtZW50KTsiLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvZ2V0VXJsLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18gPSBuZXcgVVJMKFwiLi9hc3NldHMvZm9udHMvUm9ib3RvX0NvbmRlbnNlZC9zdGF0aWMvUm9ib3RvQ29uZGVuc2VkLU1lZGl1bS50dGZcIiwgaW1wb3J0Lm1ldGEudXJsKTtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19fID0gX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYEBmb250LWZhY2Uge1xuICAvKiBodHRwczovL2ZvbnRzLmdvb2dsZS5jb20vc3BlY2ltZW4vUm9ib3RvK0NvbmRlbnNlZCAqL1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xuICBzcmM6IHVybCgke19fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX199KTtcbiAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xufVxuXG4qLFxuKjo6YmVmb3JlLFxuKjo6YWZ0ZXIge1xuICBwYWRkaW5nOiAwO1xuICBtYXJnaW46IDA7XG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gIGZvbnQtc2l6ZTogMTZweDtcbn1cblxuYm9keSB7XG4gIG1pbi1oZWlnaHQ6IDEwMHN2aDtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE0OSwgMTE2LCA1OSk7XG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCcsIEFyaWFsO1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xuICBmb250LWZhbWlseTogQXJpYWw7XG59XG5cbiNiYXR0bGVzaGlwX2FwcCB7XG4gIG1pbi1oZWlnaHQ6IGluaGVyaXQ7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtcm93czogbWluLWNvbnRlbnQgMWZyO1xufVxuXG4jbWFpbl9jb250ZW50IHtcbiAgLyogVGVtcG9yYXJ5ICovXG4gIC8qIG1hcmdpbi10b3A6IDRlbTsgKi9cbn1cblxuI21haW5fY29udGVudCA+IDpmaXJzdC1jaGlsZCB7XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9hcHAuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsdURBQXVEO0VBQ3ZELCtCQUErQjtFQUMvQiw0Q0FBMkU7RUFDM0UsZ0JBQWdCO0VBQ2hCLGtCQUFrQjtBQUNwQjs7QUFFQTs7O0VBR0UsVUFBVTtFQUNWLFNBQVM7RUFDVCxzQkFBc0I7RUFDdEIsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixtQ0FBbUM7RUFDbkMsc0NBQXNDO0VBQ3RDLCtCQUErQjtFQUMvQixrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxtQkFBbUI7RUFDbkIsYUFBYTtFQUNiLG1DQUFtQztBQUNyQzs7QUFFQTtFQUNFLGNBQWM7RUFDZCxxQkFBcUI7QUFDdkI7O0FBRUE7RUFDRSxZQUFZO0VBQ1osYUFBYTtFQUNiLHVCQUF1QjtBQUN6QlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCJAZm9udC1mYWNlIHtcXG4gIC8qIGh0dHBzOi8vZm9udHMuZ29vZ2xlLmNvbS9zcGVjaW1lbi9Sb2JvdG8rQ29uZGVuc2VkICovXFxuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xcbiAgc3JjOiB1cmwoLi9hc3NldHMvZm9udHMvUm9ib3RvX0NvbmRlbnNlZC9zdGF0aWMvUm9ib3RvQ29uZGVuc2VkLU1lZGl1bS50dGYpO1xcbiAgZm9udC13ZWlnaHQ6IDYwMDtcXG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcXG59XFxuXFxuKixcXG4qOjpiZWZvcmUsXFxuKjo6YWZ0ZXIge1xcbiAgcGFkZGluZzogMDtcXG4gIG1hcmdpbjogMDtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBmb250LXNpemU6IDE2cHg7XFxufVxcblxcbmJvZHkge1xcbiAgbWluLWhlaWdodDogMTAwc3ZoO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE0OSwgMTE2LCA1OSk7XFxuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnLCBBcmlhbDtcXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XFxuICBmb250LWZhbWlseTogQXJpYWw7XFxufVxcblxcbiNiYXR0bGVzaGlwX2FwcCB7XFxuICBtaW4taGVpZ2h0OiBpbmhlcml0O1xcbiAgZGlzcGxheTogZ3JpZDtcXG4gIGdyaWQtdGVtcGxhdGUtcm93czogbWluLWNvbnRlbnQgMWZyO1xcbn1cXG5cXG4jbWFpbl9jb250ZW50IHtcXG4gIC8qIFRlbXBvcmFyeSAqL1xcbiAgLyogbWFyZ2luLXRvcDogNGVtOyAqL1xcbn1cXG5cXG4jbWFpbl9jb250ZW50ID4gOmZpcnN0LWNoaWxkIHtcXG4gIGhlaWdodDogMTAwJTtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjaGVhZGVyIHtcbiAgcGFkZGluZzogMWVtIDJlbSA0ZW07XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYigxNjUsIDE2NSwgMTY1KTtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9oZWFkZXIuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0Usb0JBQW9CO0VBQ3BCLG9DQUFvQztBQUN0Q1wiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjaGVhZGVyIHtcXG4gIHBhZGRpbmc6IDFlbSAyZW0gNGVtO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE2NSwgMTY1LCAxNjUpO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNob21lIHtcbn1cblxuLmdhbWVtb2RlX2J0bnMge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgZ2FwOiAyZW07XG59XG5cbi5nYW1lbW9kZV9idG5zID4gKiB7XG4gIHBhZGRpbmc6IDJlbTtcbn1cblxuLmdhbWVtb2RlX2J0bnMgPiAqID4gc3BhbiB7XG4gIGZvbnQtc2l6ZTogMmVtO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL2hvbWUuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0FBQ0E7O0FBRUE7RUFDRSxhQUFhO0VBQ2Isc0JBQXNCO0VBQ3RCLHVCQUF1QjtFQUN2QixRQUFRO0FBQ1Y7O0FBRUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxjQUFjO0FBQ2hCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNob21lIHtcXG59XFxuXFxuLmdhbWVtb2RlX2J0bnMge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG4gIGdhcDogMmVtO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICoge1xcbiAgcGFkZGluZzogMmVtO1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyA+ICogPiBzcGFuIHtcXG4gIGZvbnQtc2l6ZTogMmVtO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNuYXZiYXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG59XG5cbiNuYXZiYXIgPiAqIHtcbiAgZGlzcGxheTogZmxleDtcbiAgbGlzdC1zdHlsZTogbm9uZTtcbn1cblxuLm5hdl9yaWdodCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbn1cblxuLm5hdl9yaWdodCA+IDpsYXN0LWNoaWxkIHtcbiAgLyogRXhwZXJpbWVudGluZyAqL1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHJpZ2h0OiAwO1xuICB0b3A6IDFlbTtcbiAgcGFkZGluZzogMXJlbTtcbn1cblxuLm5hdl9pdGVtLm5hdl9sb2dvIHtcbiAgZGlzcGxheTogZmxleDtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9uYXZiYXIuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtFQUNiLDhCQUE4QjtBQUNoQzs7QUFFQTtFQUNFLGFBQWE7RUFDYixnQkFBZ0I7QUFDbEI7O0FBRUE7RUFDRSxrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsa0JBQWtCO0VBQ2xCLFFBQVE7RUFDUixRQUFRO0VBQ1IsYUFBYTtBQUNmOztBQUVBO0VBQ0UsYUFBYTtBQUNmXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNuYXZiYXIge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG59XFxuXFxuI25hdmJhciA+ICoge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGxpc3Qtc3R5bGU6IG5vbmU7XFxufVxcblxcbi5uYXZfcmlnaHQge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG5cXG4ubmF2X3JpZ2h0ID4gOmxhc3QtY2hpbGQge1xcbiAgLyogRXhwZXJpbWVudGluZyAqL1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgcmlnaHQ6IDA7XFxuICB0b3A6IDFlbTtcXG4gIHBhZGRpbmc6IDFyZW07XFxufVxcblxcbi5uYXZfaXRlbS5uYXZfbG9nbyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYC5ub3RpZmljYXRpb25zX2NvbnRhaW5lciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtFQUNiLHVCQUF1QjtBQUN6QlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIubm90aWZpY2F0aW9uc19jb250YWluZXIge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYC5wb3J0X2xpbmVzIHtcbiAgZGlzcGxheTogZmxleDtcbn1cblxuLnBvcnRfc2hpcCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgYm9yZGVyOiAxcHggZG90dGVkICNiMmIyYjk7XG4gIG1hcmdpbjogMC41ZW07XG4gIC8qIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAqL1xufVxuXG4uc2hpcF9ib3gge1xuICB6LWluZGV4OiAyO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMjU1LCAwLjA1KTtcbiAgYm9yZGVyOiAycHggc29saWQgIzAwZjtcbiAgbGVmdDogMDtcbiAgdG9wOiAwO1xuICAvKiBib3gtc2l6aW5nOiBjb250ZW50LWJveDsgKi9cbn1cblxuLnNoaXBfYm94OmhvdmVyIHtcbiAgY3Vyc29yOiBtb3ZlO1xufVxuXG4uY2VsbF9jb250ZW50ID4gLnNoaXBfYm94IHtcbiAgLyogQ29tbWVudCBvdXQgaWYgdXNpbmcgYm94LXNpemluZzogY29udGVudCAqL1xuICBsZWZ0OiAtNCU7XG4gIHRvcDogLTQlO1xufVxuXG4uc2hpcF9ib3guZHJhZ2dpbmcuc2hpcF9ib3hfdHJhbnNwYXJlbnQge1xuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgYm9yZGVyOiB0cmFuc3BhcmVudDtcbn1cblxuLnNoaXBfYm94X3BsYWNlaG9sZGVyIHtcbiAgYm9yZGVyLWNvbG9yOiAjNDBiZjQ0O1xuICBiYWNrZ3JvdW5kOiByZ2JhKDY0LCAxOTEsIDY4LCAwLjA1KTtcbn1cblxuLnJvdGF0ZV9lcnJvciB7XG4gIGJvcmRlci1jb2xvcjogcmVkO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL3BvcnQuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLDBCQUEwQjtFQUMxQixhQUFhO0VBQ2IsNkJBQTZCO0FBQy9COztBQUVBO0VBQ0UsVUFBVTtFQUNWLGtCQUFrQjtFQUNsQixpQ0FBaUM7RUFDakMsc0JBQXNCO0VBQ3RCLE9BQU87RUFDUCxNQUFNO0VBQ04sNkJBQTZCO0FBQy9COztBQUVBO0VBQ0UsWUFBWTtBQUNkOztBQUVBO0VBQ0UsNkNBQTZDO0VBQzdDLFNBQVM7RUFDVCxRQUFRO0FBQ1Y7O0FBRUE7RUFDRSx1QkFBdUI7RUFDdkIsbUJBQW1CO0FBQ3JCOztBQUVBO0VBQ0UscUJBQXFCO0VBQ3JCLG1DQUFtQztBQUNyQzs7QUFFQTtFQUNFLGlCQUFpQjtBQUNuQlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIucG9ydF9saW5lcyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cXG4ucG9ydF9zaGlwIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGJvcmRlcjogMXB4IGRvdHRlZCAjYjJiMmI5O1xcbiAgbWFyZ2luOiAwLjVlbTtcXG4gIC8qIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAqL1xcbn1cXG5cXG4uc2hpcF9ib3gge1xcbiAgei1pbmRleDogMjtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMjU1LCAwLjA1KTtcXG4gIGJvcmRlcjogMnB4IHNvbGlkICMwMGY7XFxuICBsZWZ0OiAwO1xcbiAgdG9wOiAwO1xcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXFxufVxcblxcbi5zaGlwX2JveDpob3ZlciB7XFxuICBjdXJzb3I6IG1vdmU7XFxufVxcblxcbi5jZWxsX2NvbnRlbnQgPiAuc2hpcF9ib3gge1xcbiAgLyogQ29tbWVudCBvdXQgaWYgdXNpbmcgYm94LXNpemluZzogY29udGVudCAqL1xcbiAgbGVmdDogLTQlO1xcbiAgdG9wOiAtNCU7XFxufVxcblxcbi5zaGlwX2JveC5kcmFnZ2luZy5zaGlwX2JveF90cmFuc3BhcmVudCB7XFxuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcXG4gIGJvcmRlcjogdHJhbnNwYXJlbnQ7XFxufVxcblxcbi5zaGlwX2JveF9wbGFjZWhvbGRlciB7XFxuICBib3JkZXItY29sb3I6ICM0MGJmNDQ7XFxuICBiYWNrZ3JvdW5kOiByZ2JhKDY0LCAxOTEsIDY4LCAwLjA1KTtcXG59XFxuXFxuLnJvdGF0ZV9lcnJvciB7XFxuICBib3JkZXItY29sb3I6IHJlZDtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjYm9hcmRzX2NvbnRhaW5lciB7XG4gIG1hcmdpbi10b3A6IDRlbTtcbiAgZGlzcGxheTogZmxleDtcbiAgZ2FwOiA4cmVtO1xuICB1c2VyLXNlbGVjdDogbm9uZTtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiB7XG4gIGRpc3BsYXk6IGZsZXg7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKi53YWl0ID4gKjpub3QoLmdhbWVfc3RhcnQpIHtcbiAgb3BhY2l0eTogMC40O1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gYnV0dG9uIHtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBib3JkZXI6IG5vbmU7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKjpub3QoLndhaXQpID4gKiA+ICogPiAuY2VsbCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xufVxuXG4ucGxheWVyX29uZSxcbi5wbGF5ZXJfdHdvIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICB3aWR0aDogbWluLWNvbnRlbnQ7XG59XG5cbi5wbGF5ZXJfdHdvID4gLmdhbWVfc3RhcnQge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4ucGxheWVyX3R3by53YWl0ID4gLmdhbWVfc3RhcnQge1xuICBkaXNwbGF5OiBibG9jaztcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDIwJTtcbn1cblxuLmdhbWVfc3RhcnQgPiBidXR0b24ge1xuICBmb250LXNpemU6IDRyZW07XG59XG5cbi5jZWxsID4gKiB7XG4gIHdpZHRoOiAyZW07XG4gIGhlaWdodDogMmVtO1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGJhY2tncm91bmQtY29sb3I6IHdoaXRlO1xuICAvKiBwb2ludGVyLWV2ZW50czogbm9uZTsgKi9cbiAgYm9yZGVyOiAxcHggc29saWQgYmxhY2s7XG4gIC8qIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAqL1xufVxuXG4uY2VsbCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XG4gIC8qXG4gIFNob3cgc2hpcCBkdXJpbmcgcGxhY2luZyBzaGlwcyBwaGFzZVxuICBTaG93IG9ubHkgYWN0aXZlIHBsYXllcidzIHNoaXAgd2hlbiBnYW1lIGlzIGluIHBsYXlcbiAgKi9cbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gIGhlaWdodDogaW5oZXJpdDtcbiAgYmFja2dyb3VuZC1jb2xvcjogY29ybmZsb3dlcmJsdWU7XG59XG5cbi8qICNib2FyZF9jb250YWluZXIgPiAqOm5vdCgud2FpdCkgPiAuYm9hcmQgPiAuYm9hcmRfcm93ID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwLCAqL1xuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XG4gIGJhY2tncm91bmQtY29sb3I6IHJlZDtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogZ3JleTtcbn1cblxuLmNlbGxfY29udGVudCA+IC5yb3dfbWFya2VyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBoZWlnaHQ6IDEwMCU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGxlZnQ6IC0yZW07XG4gIHRvcDogMDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgei1pbmRleDogLTE7XG59XG5cbi5jZWxsX2NvbnRlbnQgPiAuY29sX21hcmtlciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAtMmVtO1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHdpZHRoOiAxMDAlO1xuICB6LWluZGV4OiAtMTtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGVBQWU7RUFDZixhQUFhO0VBQ2IsU0FBUztFQUNULGlCQUFpQjtBQUNuQjs7QUFFQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLGVBQWU7RUFDZixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSw2QkFBNkI7QUFDL0I7O0FBRUE7O0VBRUUsa0JBQWtCO0VBQ2xCLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLGNBQWM7RUFDZCxrQkFBa0I7RUFDbEIsUUFBUTtBQUNWOztBQUVBO0VBQ0UsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLFVBQVU7RUFDVixXQUFXO0VBQ1gsa0JBQWtCO0VBQ2xCLHVCQUF1QjtFQUN2QiwwQkFBMEI7RUFDMUIsdUJBQXVCO0VBQ3ZCLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFOzs7R0FHQztFQUNELG9CQUFvQjtFQUNwQixlQUFlO0VBQ2YsZ0NBQWdDO0FBQ2xDOztBQUVBLCtGQUErRjtBQUMvRjtFQUNFLHFCQUFxQjtBQUN2Qjs7QUFFQTtFQUNFLHNCQUFzQjtBQUN4Qjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixZQUFZO0VBQ1osYUFBYTtFQUNiLFVBQVU7RUFDVixNQUFNO0VBQ04sbUJBQW1CO0VBQ25CLFdBQVc7QUFDYjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixTQUFTO0VBQ1Qsa0JBQWtCO0VBQ2xCLFdBQVc7RUFDWCxXQUFXO0FBQ2JcIixcInNvdXJjZXNDb250ZW50XCI6W1wiI2JvYXJkc19jb250YWluZXIge1xcbiAgbWFyZ2luLXRvcDogNGVtO1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGdhcDogOHJlbTtcXG4gIHVzZXItc2VsZWN0OiBub25lO1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKi53YWl0ID4gKjpub3QoLmdhbWVfc3RhcnQpIHtcXG4gIG9wYWNpdHk6IDAuNDtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IGJ1dHRvbiB7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBib3JkZXI6IG5vbmU7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKjpub3QoLndhaXQpID4gKiA+ICogPiAuY2VsbCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG59XFxuXFxuLnBsYXllcl9vbmUsXFxuLnBsYXllcl90d28ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgd2lkdGg6IG1pbi1jb250ZW50O1xcbn1cXG5cXG4ucGxheWVyX3R3byA+IC5nYW1lX3N0YXJ0IHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcblxcbi5wbGF5ZXJfdHdvLndhaXQgPiAuZ2FtZV9zdGFydCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMjAlO1xcbn1cXG5cXG4uZ2FtZV9zdGFydCA+IGJ1dHRvbiB7XFxuICBmb250LXNpemU6IDRyZW07XFxufVxcblxcbi5jZWxsID4gKiB7XFxuICB3aWR0aDogMmVtO1xcbiAgaGVpZ2h0OiAyZW07XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTtcXG4gIC8qIHBvaW50ZXItZXZlbnRzOiBub25lOyAqL1xcbiAgYm9yZGVyOiAxcHggc29saWQgYmxhY2s7XFxuICAvKiBib3gtc2l6aW5nOiBjb250ZW50LWJveDsgKi9cXG59XFxuXFxuLmNlbGwgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xcbiAgLypcXG4gIFNob3cgc2hpcCBkdXJpbmcgcGxhY2luZyBzaGlwcyBwaGFzZVxcbiAgU2hvdyBvbmx5IGFjdGl2ZSBwbGF5ZXIncyBzaGlwIHdoZW4gZ2FtZSBpcyBpbiBwbGF5XFxuICAqL1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuICBoZWlnaHQ6IGluaGVyaXQ7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBjb3JuZmxvd2VyYmx1ZTtcXG59XFxuXFxuLyogI2JvYXJkX2NvbnRhaW5lciA+ICo6bm90KC53YWl0KSA+IC5ib2FyZCA+IC5ib2FyZF9yb3cgPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAsICovXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5taXNzID4gLmNlbGxfY29udGVudCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBncmV5O1xcbn1cXG5cXG4uY2VsbF9jb250ZW50ID4gLnJvd19tYXJrZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGxlZnQ6IC0yZW07XFxuICB0b3A6IDA7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgei1pbmRleDogLTE7XFxufVxcblxcbi5jZWxsX2NvbnRlbnQgPiAuY29sX21hcmtlciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IC0yZW07XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB3aWR0aDogMTAwJTtcXG4gIHotaW5kZXg6IC0xO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gIE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gIEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKSB7XG4gIHZhciBsaXN0ID0gW107XG5cbiAgLy8gcmV0dXJuIHRoZSBsaXN0IG9mIG1vZHVsZXMgYXMgY3NzIHN0cmluZ1xuICBsaXN0LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICB2YXIgY29udGVudCA9IFwiXCI7XG4gICAgICB2YXIgbmVlZExheWVyID0gdHlwZW9mIGl0ZW1bNV0gIT09IFwidW5kZWZpbmVkXCI7XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpO1xuICAgICAgfVxuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBjb250ZW50ICs9IGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcoaXRlbSk7XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bNF0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0pLmpvaW4oXCJcIik7XG4gIH07XG5cbiAgLy8gaW1wb3J0IGEgbGlzdCBvZiBtb2R1bGVzIGludG8gdGhlIGxpc3RcbiAgbGlzdC5pID0gZnVuY3Rpb24gaShtb2R1bGVzLCBtZWRpYSwgZGVkdXBlLCBzdXBwb3J0cywgbGF5ZXIpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZXMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIHVuZGVmaW5lZF1dO1xuICAgIH1cbiAgICB2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuICAgIGlmIChkZWR1cGUpIHtcbiAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5sZW5ndGg7IGsrKykge1xuICAgICAgICB2YXIgaWQgPSB0aGlzW2tdWzBdO1xuICAgICAgICBpZiAoaWQgIT0gbnVsbCkge1xuICAgICAgICAgIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBfayA9IDA7IF9rIDwgbW9kdWxlcy5sZW5ndGg7IF9rKyspIHtcbiAgICAgIHZhciBpdGVtID0gW10uY29uY2F0KG1vZHVsZXNbX2tdKTtcbiAgICAgIGlmIChkZWR1cGUgJiYgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpdGVtWzBdXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbGF5ZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtWzVdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWVkaWEpIHtcbiAgICAgICAgaWYgKCFpdGVtWzJdKSB7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN1cHBvcnRzKSB7XG4gICAgICAgIGlmICghaXRlbVs0XSkge1xuICAgICAgICAgIGl0ZW1bNF0gPSBcIlwiLmNvbmNhdChzdXBwb3J0cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzRdID0gc3VwcG9ydHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGxpc3QucHVzaChpdGVtKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBsaXN0O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBpZiAoIXVybCkge1xuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgdXJsID0gU3RyaW5nKHVybC5fX2VzTW9kdWxlID8gdXJsLmRlZmF1bHQgOiB1cmwpO1xuXG4gIC8vIElmIHVybCBpcyBhbHJlYWR5IHdyYXBwZWQgaW4gcXVvdGVzLCByZW1vdmUgdGhlbVxuICBpZiAoL15bJ1wiXS4qWydcIl0kLy50ZXN0KHVybCkpIHtcbiAgICB1cmwgPSB1cmwuc2xpY2UoMSwgLTEpO1xuICB9XG4gIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICB1cmwgKz0gb3B0aW9ucy5oYXNoO1xuICB9XG5cbiAgLy8gU2hvdWxkIHVybCBiZSB3cmFwcGVkP1xuICAvLyBTZWUgaHR0cHM6Ly9kcmFmdHMuY3Nzd2cub3JnL2Nzcy12YWx1ZXMtMy8jdXJsc1xuICBpZiAoL1tcIicoKSBcXHRcXG5dfCglMjApLy50ZXN0KHVybCkgfHwgb3B0aW9ucy5uZWVkUXVvdGVzKSB7XG4gICAgcmV0dXJuIFwiXFxcIlwiLmNvbmNhdCh1cmwucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpLCBcIlxcXCJcIik7XG4gIH1cbiAgcmV0dXJuIHVybDtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgdmFyIGNvbnRlbnQgPSBpdGVtWzFdO1xuICB2YXIgY3NzTWFwcGluZyA9IGl0ZW1bM107XG4gIGlmICghY3NzTWFwcGluZykge1xuICAgIHJldHVybiBjb250ZW50O1xuICB9XG4gIGlmICh0eXBlb2YgYnRvYSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KGNzc01hcHBpbmcpKSkpO1xuICAgIHZhciBkYXRhID0gXCJzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxcIi5jb25jYXQoYmFzZTY0KTtcbiAgICB2YXIgc291cmNlTWFwcGluZyA9IFwiLyojIFwiLmNvbmNhdChkYXRhLCBcIiAqL1wiKTtcbiAgICByZXR1cm4gW2NvbnRlbnRdLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oXCJcXG5cIik7XG4gIH1cbiAgcmV0dXJuIFtjb250ZW50XS5qb2luKFwiXFxuXCIpO1xufTsiLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vYXBwLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vYXBwLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9oZWFkZXIuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9oZWFkZXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2hvbWUuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ob21lLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9uYXZiYXIuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9uYXZiYXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25vdGlmaWNhdGlvbnMuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ub3RpZmljYXRpb25zLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9wb3J0LmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vcG9ydC5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vc2NyZWVuQ29udHJvbGxlci5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3NjcmVlbkNvbnRyb2xsZXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzdHlsZXNJbkRPTSA9IFtdO1xuZnVuY3Rpb24gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICB2YXIgcmVzdWx0ID0gLTE7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3R5bGVzSW5ET00ubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3R5bGVzSW5ET01baV0uaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcikge1xuICAgICAgcmVzdWx0ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGlkQ291bnRNYXAgPSB7fTtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICB2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcbiAgICB2YXIgY291bnQgPSBpZENvdW50TWFwW2lkXSB8fCAwO1xuICAgIHZhciBpZGVudGlmaWVyID0gXCJcIi5jb25jYXQoaWQsIFwiIFwiKS5jb25jYXQoY291bnQpO1xuICAgIGlkQ291bnRNYXBbaWRdID0gY291bnQgKyAxO1xuICAgIHZhciBpbmRleEJ5SWRlbnRpZmllciA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgIHZhciBvYmogPSB7XG4gICAgICBjc3M6IGl0ZW1bMV0sXG4gICAgICBtZWRpYTogaXRlbVsyXSxcbiAgICAgIHNvdXJjZU1hcDogaXRlbVszXSxcbiAgICAgIHN1cHBvcnRzOiBpdGVtWzRdLFxuICAgICAgbGF5ZXI6IGl0ZW1bNV1cbiAgICB9O1xuICAgIGlmIChpbmRleEJ5SWRlbnRpZmllciAhPT0gLTEpIHtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS5yZWZlcmVuY2VzKys7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0udXBkYXRlcihvYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdXBkYXRlciA9IGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5ieUluZGV4ID0gaTtcbiAgICAgIHN0eWxlc0luRE9NLnNwbGljZShpLCAwLCB7XG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHVwZGF0ZXI6IHVwZGF0ZXIsXG4gICAgICAgIHJlZmVyZW5jZXM6IDFcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG4gIHJldHVybiBpZGVudGlmaWVycztcbn1cbmZ1bmN0aW9uIGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpIHtcbiAgdmFyIGFwaSA9IG9wdGlvbnMuZG9tQVBJKG9wdGlvbnMpO1xuICBhcGkudXBkYXRlKG9iaik7XG4gIHZhciB1cGRhdGVyID0gZnVuY3Rpb24gdXBkYXRlcihuZXdPYmopIHtcbiAgICBpZiAobmV3T2JqKSB7XG4gICAgICBpZiAobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwICYmIG5ld09iai5zdXBwb3J0cyA9PT0gb2JqLnN1cHBvcnRzICYmIG5ld09iai5sYXllciA9PT0gb2JqLmxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFwaS51cGRhdGUob2JqID0gbmV3T2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBpLnJlbW92ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHVwZGF0ZXI7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgdmFyIGxhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG4gICAgbmV3TGlzdCA9IG5ld0xpc3QgfHwgW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpZGVudGlmaWVyID0gbGFzdElkZW50aWZpZXJzW2ldO1xuICAgICAgdmFyIGluZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleF0ucmVmZXJlbmNlcy0tO1xuICAgIH1cbiAgICB2YXIgbmV3TGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKG5ld0xpc3QsIG9wdGlvbnMpO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuICAgICAgdmFyIF9pbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKF9pZGVudGlmaWVyKTtcbiAgICAgIGlmIChzdHlsZXNJbkRPTVtfaW5kZXhdLnJlZmVyZW5jZXMgPT09IDApIHtcbiAgICAgICAgc3R5bGVzSW5ET01bX2luZGV4XS51cGRhdGVyKCk7XG4gICAgICAgIHN0eWxlc0luRE9NLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBsYXN0SWRlbnRpZmllcnMgPSBuZXdMYXN0SWRlbnRpZmllcnM7XG4gIH07XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbWVtbyA9IHt9O1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGdldFRhcmdldCh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiBtZW1vW3RhcmdldF0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgc3R5bGVUYXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCk7XG5cbiAgICAvLyBTcGVjaWFsIGNhc2UgdG8gcmV0dXJuIGhlYWQgb2YgaWZyYW1lIGluc3RlYWQgb2YgaWZyYW1lIGl0c2VsZlxuICAgIGlmICh3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQgJiYgc3R5bGVUYXJnZXQgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgIC8vIGR1ZSB0byBjcm9zcy1vcmlnaW4gcmVzdHJpY3Rpb25zXG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gc3R5bGVUYXJnZXQuY29udGVudERvY3VtZW50LmhlYWQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0XG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgbWVtb1t0YXJnZXRdID0gc3R5bGVUYXJnZXQ7XG4gIH1cbiAgcmV0dXJuIG1lbW9bdGFyZ2V0XTtcbn1cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRCeVNlbGVjdG9yKGluc2VydCwgc3R5bGUpIHtcbiAgdmFyIHRhcmdldCA9IGdldFRhcmdldChpbnNlcnQpO1xuICBpZiAoIXRhcmdldCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGZpbmQgYSBzdHlsZSB0YXJnZXQuIFRoaXMgcHJvYmFibHkgbWVhbnMgdGhhdCB0aGUgdmFsdWUgZm9yIHRoZSAnaW5zZXJ0JyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG4gIH1cbiAgdGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0QnlTZWxlY3RvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgb3B0aW9ucy5zZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gIG9wdGlvbnMuaW5zZXJ0KGVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG4gIHJldHVybiBlbGVtZW50O1xufVxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzKHN0eWxlRWxlbWVudCkge1xuICB2YXIgbm9uY2UgPSB0eXBlb2YgX193ZWJwYWNrX25vbmNlX18gIT09IFwidW5kZWZpbmVkXCIgPyBfX3dlYnBhY2tfbm9uY2VfXyA6IG51bGw7XG4gIGlmIChub25jZSkge1xuICAgIHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJub25jZVwiLCBub25jZSk7XG4gIH1cbn1cbm1vZHVsZS5leHBvcnRzID0gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG4gIHZhciBjc3MgPSBcIlwiO1xuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQob2JqLnN1cHBvcnRzLCBcIikge1wiKTtcbiAgfVxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwiQG1lZGlhIFwiLmNvbmNhdChvYmoubWVkaWEsIFwiIHtcIik7XG4gIH1cbiAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBvYmoubGF5ZXIgIT09IFwidW5kZWZpbmVkXCI7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJAbGF5ZXJcIi5jb25jYXQob2JqLmxheWVyLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQob2JqLmxheWVyKSA6IFwiXCIsIFwiIHtcIik7XG4gIH1cbiAgY3NzICs9IG9iai5jc3M7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG4gIHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuICBpZiAoc291cmNlTWFwICYmIHR5cGVvZiBidG9hICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgY3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIi5jb25jYXQoYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSwgXCIgKi9cIik7XG4gIH1cblxuICAvLyBGb3Igb2xkIElFXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAgKi9cbiAgb3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbn1cbmZ1bmN0aW9uIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpIHtcbiAgLy8gaXN0YW5idWwgaWdub3JlIGlmXG4gIGlmIChzdHlsZUVsZW1lbnQucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBzdHlsZUVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQpO1xufVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGRvbUFQSShvcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUoKSB7fSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cbiAgICB9O1xuICB9XG4gIHZhciBzdHlsZUVsZW1lbnQgPSBvcHRpb25zLmluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICAgIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge1xuICAgICAgcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG4gICAgfVxuICB9O1xufVxubW9kdWxlLmV4cG9ydHMgPSBkb21BUEk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc3R5bGVUYWdUcmFuc2Zvcm0oY3NzLCBzdHlsZUVsZW1lbnQpIHtcbiAgaWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgIHN0eWxlRWxlbWVudC5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBzdHlsZVRhZ1RyYW5zZm9ybTsiLCJpbXBvcnQgJ0BpY29uZnUvc3ZnLWluamVjdCc7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgYnVpbGRIZWFkZXIgZnJvbSAnLi9jb21wb25lbnRzL2hlYWRlci9oZWFkZXInO1xuaW1wb3J0IGJ1aWxkTWFpbiBmcm9tICcuL2NvbXBvbmVudHMvbWFpbi9tYWluJztcbmltcG9ydCAnLi9hcHAuY3NzJztcblxuKCgpID0+IHtcbiAgY29uc3QgYnVpbGQgPSB7XG4gICAgaGVhZGVyOiBidWlsZEhlYWRlcixcbiAgICBtYWluOiBidWlsZE1haW4sXG4gIH07XG5cbiAgY29uc3QgYXBwID0ge1xuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgYXBwV3JhcHBlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgYXBwV3JhcHBlci5pZCA9ICdiYXR0bGVzaGlwX2FwcCc7XG5cbiAgICAgIGFwcFdyYXBwZXIuYXBwZW5kQ2hpbGQoYnVpbGQuaGVhZGVyKCkpO1xuICAgICAgYXBwV3JhcHBlci5hcHBlbmRDaGlsZChidWlsZC5tYWluKCkpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhcHBXcmFwcGVyKTtcbiAgICB9LFxuICB9O1xuXG4gIGFwcC5pbml0KCk7XG59KSgpO1xuIiwiIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBoZWFkZXJDb25maWcgZnJvbSAnLi9oZWFkZXIuY29uZmlnJztcbmltcG9ydCBuYXZiYXIgZnJvbSAnLi9uYXZiYXIvbmF2YmFyJztcbmltcG9ydCBub3RpZmljYXRpb25zIGZyb20gJy4vbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL2hlYWRlci5jc3MnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIGNvbnN0IGhlYWRlciA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5oZWFkZXIgPSBlbGVtZW50O1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHt9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGhlYWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KCdoZWFkZXInKTtcbiAgICAgIGhlYWRlckVsZW1lbnQuaWQgPSAnaGVhZGVyJztcbiAgICAgIGhlYWRlckVsZW1lbnQuYXBwZW5kQ2hpbGQobmF2YmFyKCkpO1xuICAgICAgaGVhZGVyRWxlbWVudC5hcHBlbmRDaGlsZChub3RpZmljYXRpb25zKCkpO1xuICAgICAgdGhpcy5jYWNoZURPTShoZWFkZXJFbGVtZW50KTtcblxuICAgICAgcmV0dXJuIGhlYWRlckVsZW1lbnQ7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gaGVhZGVyLnJlbmRlcigpO1xufTtcbiIsImltcG9ydCBJY29uR2l0aHViIGZyb20gJy4uLy4uLy4uL2Fzc2V0cy9pY29ucy9naXRodWJfbWFyay9naXRodWItbWFyay13aGl0ZS5zdmcnO1xuXG5leHBvcnQgZGVmYXVsdCBbXG4gIHtcbiAgICBlbGVtZW50OiAndWwnLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgIGNsYXNzOiAnbmF2X2xlZnQnLFxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICcjJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbSBuYXZfbG9nbycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdpbWcnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHNyYzogJyMnLFxuICAgICAgICAgICAgICAgICAgLy8gb25sb2FkOiAnU1ZHSW5qZWN0KHRoaXMpJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2gxJyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ0JhdHRsZXNoaXAnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG4gIHtcbiAgICBlbGVtZW50OiAndWwnLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgIGNsYXNzOiAnbmF2X3JpZ2h0JyxcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnIycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0nLFxuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1BsYWNlaG9sZGVyJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnIycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0nLFxuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1BsYWNlaG9sZGVyJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnaHR0cHM6Ly9naXRodWIuY29tL21pa2V5Q29zL2JhdHRsZXNoaXAvdHJlZS9tYWluJyxcbiAgICAgICAgICAgICAgdGFyZ2V0OiAnX2JsYW5rJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdpbWcnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHNyYzogSWNvbkdpdGh1YixcbiAgICAgICAgICAgICAgICAgIG9ubG9hZDogJ1NWR0luamVjdCh0aGlzKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgIHRhcmdldDogJ19zZWxmJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbSBsZWF2ZV9nYW1lJyxcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdMZWF2ZSBnYW1lJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbl07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IG5hdmJhckNvbmZpZyBmcm9tICcuL25hdmJhci5jb25maWcnO1xuaW1wb3J0ICcuLi8uLi8uLi9zdHlsZXMvbmF2YmFyLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgbmF2YmFyID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLm5hdmJhciA9IGVsZW1lbnQ7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge30sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgbmF2RWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoJ25hdicpO1xuICAgICAgbmF2RWxlbWVudC5pZCA9ICduYXZiYXInO1xuXG4gICAgICBuYXZiYXJDb25maWcuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCBuYXZDaGlsZCA9IGNyZWF0ZUVsZW1lbnQoaXRlbS5lbGVtZW50KTtcbiAgICAgICAgbmF2Q2hpbGQuc2V0QXR0cmlidXRlcyhpdGVtLmF0dHJpYnV0ZXMpO1xuICAgICAgICBuYXZDaGlsZC5zZXRDaGlsZHJlbihpdGVtLmNoaWxkcmVuKTtcbiAgICAgICAgbmF2RWxlbWVudC5hcHBlbmRDaGlsZChuYXZDaGlsZCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5jYWNoZURPTShuYXZFbGVtZW50KTtcbiAgICAgIHJldHVybiBuYXZFbGVtZW50O1xuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIG5hdmJhci5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgJy4uLy4uLy4uL3N0eWxlcy9ub3RpZmljYXRpb25zLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3Qgbm90aWZpY2F0aW9ucyA9IHtcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy51cGRhdGVOb3RpZmljYXRpb24gPSB0aGlzLnVwZGF0ZU5vdGlmaWNhdGlvbi5iaW5kKHRoaXMpO1xuICAgIH0sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5ub3RpZmljYXRpb25NZXNzYWdlID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcjbm90aWZpY2F0aW9uX21lc3NhZ2UnKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKCdub3RpZnknLCB0aGlzLnVwZGF0ZU5vdGlmaWNhdGlvbik7XG4gICAgfSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBub3RpZmljYXRpb25zQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBub3RpZmljYXRpb25NZXNzYWdlID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgIG5vdGlmaWNhdGlvbnNDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnbm90aWZpY2F0aW9uc19jb250YWluZXInKTtcbiAgICAgIG5vdGlmaWNhdGlvbk1lc3NhZ2Uuc2V0QXR0cmlidXRlcyh7XG4gICAgICAgIGlkOiAnbm90aWZpY2F0aW9uX21lc3NhZ2UnLFxuICAgICAgICB0ZXh0Q29udGVudDogJ1BpY2sgZ2FtZSBtb2RlJyxcbiAgICAgIH0pO1xuXG4gICAgICBub3RpZmljYXRpb25zQ29udGFpbmVyLmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbk1lc3NhZ2UpO1xuICAgICAgdGhpcy5jYWNoZURPTShub3RpZmljYXRpb25zQ29udGFpbmVyKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuXG4gICAgICByZXR1cm4gbm90aWZpY2F0aW9uc0NvbnRhaW5lcjtcbiAgICB9LFxuICAgIHVwZGF0ZU5vdGlmaWNhdGlvbihzb21ldGhpbmcpIHtcbiAgICAgIHRoaXMubm90aWZpY2F0aW9uTWVzc2FnZS50ZXh0Q29udGVudCA9IHNvbWV0aGluZztcbiAgICB9LFxuICB9O1xuXG4gIG5vdGlmaWNhdGlvbnMuaW5pdCgpO1xuICByZXR1cm4gbm90aWZpY2F0aW9ucy5yZW5kZXIoKTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCBbXG4gIC8vIHtcbiAgLy8gICBlbGVtZW50OiAnaDInLFxuICAvLyAgIGF0dHJpYnV0ZXM6IHtcbiAgLy8gICAgIHRleHRDb250ZW50OiAnQmF0dGxlc2hpcCcsXG4gIC8vICAgfSxcbiAgLy8gfSxcbiAge1xuICAgIGVsZW1lbnQ6ICdzZWN0aW9uJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICBjbGFzczogJ2dhbWVtb2RlX2J0bnMnLFxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICBjbGFzczogJ2dhbWVtb2RlX2J0biBodW1hbl9odW1hbicsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ2h1bWFuIHZzIGh1bWFuJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdidXR0b24nLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgY2xhc3M6ICdnYW1lbW9kZV9idG4gaHVtYW5fY29tcHV0ZXInLFxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdodW1hbiB2cyBjb21wdXRlcicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG5dO1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBob21lQ29uZmlnIGZyb20gJy4vaG9tZS5jb25maWcnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9ob21lLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgaG9tZSA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5ob21lID0gZWxlbWVudDtcbiAgICAgIHRoaXMuaGVhZGVyID0gdGhpcy5ob21lLnF1ZXJ5U2VsZWN0b3IoJ2gyJyk7XG4gICAgICB0aGlzLm1vZGVCdG5zID0gdGhpcy5ob21lLnF1ZXJ5U2VsZWN0b3JBbGwoJy5nYW1lbW9kZV9idG4nKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuaG9tZSk7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLm1vZGVCdG5zKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICB0aGlzLnNldEdhbWVNb2RlID0gdGhpcy5zZXRHYW1lTW9kZS5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5tb2RlQnRucy5mb3JFYWNoKChidG4pID0+IGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuc2V0R2FtZU1vZGUpKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGhvbWVDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGhvbWVDb250YWluZXIuaWQgPSAnaG9tZSc7XG5cbiAgICAgIGhvbWVDb25maWcuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCBob21lQ2hpbGQgPSBjcmVhdGVFbGVtZW50KGl0ZW0uZWxlbWVudCk7XG4gICAgICAgIGlmIChpdGVtLmF0dHJpYnV0ZXMpIGhvbWVDaGlsZC5zZXRBdHRyaWJ1dGVzKGl0ZW0uYXR0cmlidXRlcyk7XG4gICAgICAgIGlmIChpdGVtLmNoaWxkcmVuKSBob21lQ2hpbGQuc2V0Q2hpbGRyZW4oaXRlbS5jaGlsZHJlbik7XG4gICAgICAgIGhvbWVDb250YWluZXIuYXBwZW5kQ2hpbGQoaG9tZUNoaWxkKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmNhY2hlRE9NKGhvbWVDb250YWluZXIpO1xuICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG4gICAgICByZXR1cm4gaG9tZUNvbnRhaW5lcjtcbiAgICB9LFxuICAgIHNldEdhbWVNb2RlKGUpIHtcbiAgICAgIGNvbnN0IGdhbWVtb2RlID0gIWUuY3VycmVudFRhcmdldC5jbGFzc0xpc3QudmFsdWUuaW5jbHVkZXMoJ2NvbXB1dGVyJyk7XG4gICAgICBjb25zb2xlLmxvZyhnYW1lbW9kZSk7XG4gICAgICBwdWJTdWIucHVibGlzaCgnbWFpbl9yZW5kZXInLCBnYW1lbW9kZSk7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gaG9tZS5yZW5kZXIoKTtcbn07XG4iLCIiLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHNjcmVlbkNvbnRyb2xsZXIgZnJvbSAnLi4vc2NyZWVuL3NjcmVlbkNvbnRyb2xsZXInO1xuaW1wb3J0IG1haW5Db25maWcgZnJvbSAnLi9tYWluLmNvbmZpZyc7XG5pbXBvcnQgYnVpbGRIb21lIGZyb20gJy4uL2hvbWUvaG9tZSc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCBnYW1lSW5pdCBmcm9tICcuLi9zY3JlZW4vc2NyZWVuQ29udHJvbGxlcic7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgYnVpbGQgPSB7XG4gICAgaG9tZTogYnVpbGRIb21lLFxuICAgIGdhbWU6IHNjcmVlbkNvbnRyb2xsZXIsXG4gIH07XG4gIGNvbnN0IG1haW4gPSB7XG4gICAgaW5pdCgpIHt9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMubWFpbiA9IGVsZW1lbnQ7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLm1haW4pO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKTtcbiAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ21haW5fcmVuZGVyJywgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgcmVuZGVyKG1vZGUpIHtcbiAgICAgIGlmIChtb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgbWFpbkNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBtYWluQ29udGFpbmVyLmlkID0gJ21haW5fY29udGVudCc7XG4gICAgICAgIG1haW5Db250YWluZXIuYXBwZW5kQ2hpbGQoYnVpbGQuaG9tZSgpKTtcbiAgICAgICAgdGhpcy5jYWNoZURPTShtYWluQ29udGFpbmVyKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG4gICAgICAgIHJldHVybiBtYWluQ29udGFpbmVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tYWluLmZpcnN0RWxlbWVudENoaWxkLnJlcGxhY2VXaXRoKGJ1aWxkLmdhbWUobW9kZSkpO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIG1haW4ucmVuZGVyKCk7XG59O1xuIiwiaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5cbmV4cG9ydCBkZWZhdWx0IChzdGF0ZSkgPT4gKHtcbiAgb2ZmU2V0WDogMCxcbiAgb2ZmU2V0WTogMCxcbiAgaW5pdCgpIHtcbiAgICBjb25zb2xlLmxvZygnaW5pdCBydW5uaW5nIGZyb20gY29tcG9zZUdhbWUnKTtcbiAgfSxcbiAgcmVuZGVyU2hpcChlbGVtZW50KSB7XG4gICAgLy8gVGhpcyB3aWxsIGFwcGVuZCB0byB0aGUgY29udGVudCBkaXZcbiAgICBjb25zb2xlLmxvZyhlbGVtZW50KTtcbiAgfSxcbiAgZHJhZ1N0YXJ0SGFuZGxlcihlKSB7XG4gICAgY29uc29sZS5sb2coJ2RyYWcgc3RhcnQnKTtcbiAgICB0aGlzLmRyYWdnYWJsZSA9IGUuY3VycmVudFRhcmdldDtcbiAgICB0aGlzLmRyYWdTdGFydCA9IGUudGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgdGhpcy5kcm9wUGxhY2Vob2xkZXIgPSB0aGlzLmRyYWdnYWJsZS5jbG9uZU5vZGUoKTtcbiAgICB0aGlzLmRyb3BQbGFjZWhvbGRlci5jbGFzc0xpc3QuYWRkKCdzaGlwX2JveF9wbGFjZWhvbGRlcicpO1xuICAgIHRoaXMub2ZmU2V0WCA9IGUuY2xpZW50WDtcbiAgICB0aGlzLm9mZlNldFkgPSBlLmNsaWVudFk7XG5cbiAgICAvLyBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5kcmFnRW5kSGFuZGxlcik7XG4gICAgdGhpcy5kcmFnVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKGBhZGRpbmcgbW91c2Vtb3ZlIGFuZCBtb3VzZXVwIGV2ZW50c2ApO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5kcmFnTW92ZUhhbmRsZXIpO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICAgICAgdGhpcy5kcmFnZ2FibGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLnJvdGF0ZUhhbmRsZXIpO1xuICAgIH0sIDI1MCk7XG5cbiAgICAvLyBpZiAocGFyc2VJbnQodGhpcy5kcmFnZ2FibGUuZGF0YXNldC5sZW5ndGgpID4gMSkge1xuICAgIHRoaXMuZHJhZ2dhYmxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5yb3RhdGVIYW5kbGVyLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgLy8gfVxuICB9LFxuICBkcmFnTW92ZUhhbmRsZXIoZSkge1xuICAgIC8vIGNvbnNvbGUuY2xlYXIoKTtcbiAgICBjb25zb2xlLmxvZygnZHJhZyBtb3ZlJyk7XG4gICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmFkZCgnZHJhZ2dpbmcnKTtcbiAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QuYWRkKCdkcmFnc3RhcnQnKTtcblxuICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmxlZnQgPSBgJHtlLmNsaWVudFggLSB0aGlzLm9mZlNldFh9cHhgO1xuICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAke2UuY2xpZW50WSAtIHRoaXMub2ZmU2V0WX1weGA7XG5cbiAgICBjb25zdCB7IGxlZnQsIHRvcCwgd2lkdGggfSA9IHRoaXMuZHJhZ2dhYmxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHNoaXBMZW5ndGggPSBwYXJzZUludCh0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lmxlbmd0aCk7XG4gICAgY29uc3Qgb2ZmU2V0ID0gKHdpZHRoIC8gc2hpcExlbmd0aCkgKiAwLjU7XG4gICAgY29uc3QgY2VsbCA9IGRvY3VtZW50XG4gICAgICAuZWxlbWVudHNGcm9tUG9pbnQobGVmdCArIG9mZlNldCwgdG9wICsgb2ZmU2V0KVxuICAgICAgLmZpbmQoKGVsZW1lbnQpID0+IGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjZWxsJykpO1xuICAgIGlmIChjZWxsKSB7XG4gICAgICAvLyBEcmFnZ2luZyBvdmVyIGRyb3Agem9uZVxuICAgICAgLy8gSWYgZHJhZ2dhYmxlIGlzIG1vcmUgdGhhbiA1MCUgb3ZlciBpdCdzICdsYXN0JyBjZWxsXG4gICAgICAvLyAgQXBwZW5kIHRoZSBkcmFnZ2FibGUgdG8gdGhlIGNlbGwgY29udGVudCBjb250YWluZXJcbiAgICAgIHRoaXMuY2VsbCA9IGNlbGw7XG4gICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICBjb25zdCB5ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueSk7XG5cbiAgICAgIGNvbnN0IGlkID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5pZDtcbiAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5vcmllbnRhdGlvbiAhPT0gJ2gnO1xuICAgICAgdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCB0cnVlLCBmYWxzZSwgaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEcmFnZ2luZyBvdmVyIGEgbm9uIGRyb3Agem9uZVxuICAgICAgaWYgKFxuICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QuY29udGFpbnMoJ3NoaXBfYm94X3RyYW5zcGFyZW50JykgJiZcbiAgICAgICAgdGhpcy5jZWxsLmZpcnN0Q2hpbGQubGFzdENoaWxkXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5jZWxsLmZpcnN0Q2hpbGQubGFzdENoaWxkLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNlbGwgPSBudWxsO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QucmVtb3ZlKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZHJhZ0VuZEhhbmRsZXIoZSkge1xuICAgIGNvbnNvbGUubG9nKCdkcmFnIGVuZCcpO1xuICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmxlZnQgPSBgMHB4YDtcbiAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgMHB4YDtcblxuICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdnaW5nJyk7XG4gICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgnc2hpcF9ib3hfdHJhbnNwYXJlbnQnKTtcbiAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnc3RhcnQnKTtcblxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuZHJhZ01vdmVIYW5kbGVyKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5kcmFnRW5kSGFuZGxlcik7XG4gICAgLy8gY29uc29sZS5sb2codGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLmJvYXJkKTtcbiAgICBpZiAodGhpcy5jZWxsKSB7XG4gICAgICAvLyBJZiB1c2VyIGhhcyBzdG9wcGVkIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgY29uc3QgeCA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LngpO1xuICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LnkpO1xuICAgICAgY29uc3Qgc2hpcExlbmd0aCA9IHBhcnNlSW50KHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQubGVuZ3RoKTtcbiAgICAgIGNvbnN0IGlkID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5pZDtcbiAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5vcmllbnRhdGlvbiAhPT0gJ2gnO1xuICAgICAgdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCBmYWxzZSwgZmFsc2UsIGlkKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZHJhZ1N0YXJ0LmNsYXNzTGlzdC5jb250YWlucygncG9ydF9zaGlwJykgJiYgdGhpcy5kcmFnZ2FibGUpIHtcbiAgICAgIC8vIElmIGRyYWdTdGFydCBpcyBub3QgdGhlIHBvcnRfc2hpcCBlbGVtZW50XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5sZWZ0ID0gYC00JWA7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgLTQlYDtcbiAgICB9XG4gIH0sXG4gIGRyb3BIYW5kbGVyKGlzRHJhZ2dpbmcsIGlzVmFsaWREcm9wKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2RyYWcgZHJvcCcpO1xuICAgIGlmICh0aGlzLmNlbGwpIHtcbiAgICAgIGNvbnN0IGNlbGxDb250ZW50ID0gdGhpcy5jZWxsLmZpcnN0Q2hpbGQ7XG4gICAgICBpZiAoaXNEcmFnZ2luZyAmJiBpc1ZhbGlkRHJvcCkge1xuICAgICAgICAvLyBJZiB1c2VyIGlzIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZCh0aGlzLmRyb3BQbGFjZWhvbGRlcik7XG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5hZGQoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICB9IGVsc2UgaWYgKCFpc0RyYWdnaW5nICYmIGlzVmFsaWREcm9wKSB7XG4gICAgICAgIC8vIElmIHVzZXIgaGFzIHN0b3BwZWQgZHJhZ2dpbmcgb3ZlciB0aGUgZHJvcCB6b25lXG4gICAgICAgIGNvbnNvbGUubG9nKGBkcmFnZ2luZyBzdG9wcGVkIG92ZXIgdGhlIGRyb3Agem9uZWApO1xuICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZCh0aGlzLmRyYWdnYWJsZSk7XG4gICAgICAgIHRoaXMuZHJvcFBsYWNlaG9sZGVyLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5sZWZ0ID0gYC00JWA7XG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAtNCVgO1xuICAgICAgfSBlbHNlIGlmIChpc0RyYWdnaW5nICYmICFpc1ZhbGlkRHJvcCkge1xuICAgICAgICAvLyBJZiB1c2VyIGlzIGRyYWdnaW5nIG92ZXIgYW4gaW52YWxpZCBkcm9wXG4gICAgICAgIGlmICh0aGlzLmRyb3BQbGFjZWhvbGRlcikge1xuICAgICAgICAgIHRoaXMuZHJvcFBsYWNlaG9sZGVyLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLmNlbGwgJiYgaXNEcmFnZ2luZyA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIElmIHVzZXIgaGFzIHN0b3BwZWQgZHJhZ2dpbmcgb3V0c2lkZSB0aGUgZHJvcCB6b25lXG4gICAgICAvLyBEcmFnZ2FibGUgbmVlZHMgdG8gYXBwZW5kIGJhY2sgdG8gdGhpcy5kcmFnU3RhcnRcbiAgICAgIGNvbnNvbGUubG9nKGBkcmFnZ2luZyBzdG9wcGVkIG91dHNpZGUgdGhlIGRyb3Agem9uZWApO1xuICAgIH1cbiAgfSxcbiAgcm90YXRlSGFuZGxlcihlKSB7XG4gICAgY29uc3QgbmV3T3JpZW50YXRpb24gPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lm9yaWVudGF0aW9uID09PSAnaCc7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBNb3VzZUV2ZW50KSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5kcmFnVGltZXIpO1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkcmFnZ2luZycpICYmXG4gICAgICAgICF0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QuY29udGFpbnMoJ3BvcnRfc2hpcCcpXG4gICAgICApIHtcbiAgICAgICAgLy8gSWYgc2hpcCBpcyBub3QgYmVpbmcgZHJhZ2dlZCBhbmQgaXQgaXMgbm90IGluIHBvcnRcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zb2xlLmxvZyhgcm90YXRlSGFuZGxlciBiZWluZyBjYWxsZWRgKTtcbiAgICAgICAgdGhpcy5jZWxsID0gdGhpcy5kcmFnU3RhcnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgY29uc3QgeCA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LngpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueSk7XG4gICAgICAgIGNvbnN0IHNoaXBMZW5ndGggPSBwYXJzZUludCh0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5pZDtcbiAgICAgICAgdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIG5ld09yaWVudGF0aW9uLCBmYWxzZSwgdHJ1ZSwgaWQpO1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmJvYXJkcy5wbGF5ZXJPbmUpO1xuICAgICAgfVxuICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICB9IGVsc2UgaWYgKGUgPT09IHRydWUgJiYgcGFyc2VJbnQodGhpcy5kcmFnZ2FibGUuZGF0YXNldC5sZW5ndGgpID4gMSkge1xuICAgICAgdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5vcmllbnRhdGlvbiA9IG5ld09yaWVudGF0aW9uID8gJ3YnIDogJ2gnO1xuICAgICAgY29uc3QgbmV3V2lkdGggPSBuZXdPcmllbnRhdGlvbiA/IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLndpZHRoIDogdGhpcy5kcmFnZ2FibGUuc3R5bGUuaGVpZ2h0O1xuICAgICAgY29uc3QgbmV3SGVpZ2h0ID0gbmV3T3JpZW50YXRpb24gPyB0aGlzLmRyYWdnYWJsZS5zdHlsZS5oZWlnaHQgOiB0aGlzLmRyYWdnYWJsZS5zdHlsZS53aWR0aDtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLndpZHRoID0gbmV3T3JpZW50YXRpb24gPyBuZXdIZWlnaHQgOiBuZXdXaWR0aDtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmhlaWdodCA9IG5ld09yaWVudGF0aW9uID8gbmV3V2lkdGggOiBuZXdIZWlnaHQ7XG4gICAgfSBlbHNlIGlmIChlID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmFkZCgncm90YXRlX2Vycm9yJyk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgncm90YXRlX2Vycm9yJyk7XG4gICAgICB9LCAyNTApO1xuICAgIH1cbiAgfSxcbiAgcmVzZXQoZSkge1xuICAgIC8vIENsZWFycyBib2FyZFxuICB9LFxuICBzdGFydChlKSB7XG4gICAgLy8gU2V0IHRoaXMuZ2FtZVJlYWR5IHRvIHRydWVcbiAgICAvLyBQdWJsaXNoIHNvbWV0aGluZy4uLj9cbiAgICAvLyBSZXZlYWwgcGxheWVyIHR3bydzIGJvYXJkXG4gICAgaWYgKCF0aGlzLm1vZGUpIHtcbiAgICAgIC8vIHRoaXMuYm9hcmRzLnBsYXllclR3by5wbGFjZVNoaXBzUmFuZG9tKCk7XG4gICAgICB0aGlzLmdhbWUucGxheWVyVHdvLmJvYXJkLnBsYWNlU2hpcHNSYW5kb20oKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZ2FtZS5wbGF5ZXJUd28uYm9hcmQuYm9hcmQpO1xuICAgIH1cbiAgICB0aGlzLmdhbWVSZWFkeSA9IHRydWU7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgICB0aGlzLnJlbmRlcldhaXQoKTtcbiAgfSxcbn0pO1xuIiwiaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgY29tcG9zZUdhbWUgZnJvbSAnLi9jb21wb3NlR2FtZSc7XG5cbmV4cG9ydCBkZWZhdWx0IChzdGF0ZSkgPT4gKHtcbiAgaW5pdCgpIHtcbiAgICBjb25zb2xlLmxvZyhgaW5pdCBydW5uaW5nIGZyb20gcGxheUdhbWVgKTtcbiAgfSxcbiAgdW5iaW5kRXZlbnRzKCkge1xuICAgIHRoaXMucGxheWVyT25lQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgdGhpcy5wbGF5ZXJUd29Cb2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgfSxcbiAgZ2V0QnV0dG9uKFt4LCB5XSkge1xuICAgIC8vIEZpbmQgYnV0dG9uIG9uIHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIncyBib2FyZFxuICAgIC8vIGZvciB3aGljaCBpdCdzIGRhdGFzZXQueCA9PT0geCBhbmQgZGF0YXNldC55ID09PSB5XG4gICAgY29uc3QgYm9hcmQgPSBbXG4gICAgICAuLi4odGhpcy5nYW1lLmFjdGl2ZVBsYXllciA9PT0gdGhpcy5nYW1lLnBsYXllck9uZVxuICAgICAgICA/IHRoaXMucGxheWVyVHdvQm9hcmRcbiAgICAgICAgOiB0aGlzLnBsYXllck9uZUJvYXJkXG4gICAgICApLmNoaWxkcmVuLFxuICAgIF0uZmxhdE1hcCgocm93KSA9PiBbLi4ucm93LmNoaWxkcmVuXSk7XG4gICAgcmV0dXJuIGJvYXJkLmZpbmQoKGJ0bikgPT4gYnRuLmRhdGFzZXQueCA9PSB4ICYmIGJ0bi5kYXRhc2V0LnkgPT0geSk7XG4gIH0sXG4gIHJlbmRlckF0dGFjayhjZWxsLCBjb29yZGluYXRlKSB7XG4gICAgY29uc3QgYnV0dG9uID0gdGhpcy5nZXRCdXR0b24oY29vcmRpbmF0ZSk7XG4gICAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoY2VsbC5taXNzID8gJ21pc3MnIDogJ2hpdCcpO1xuICB9LFxuICByZW5kZXJXYWl0KCkge1xuICAgIGxldCBub3RpZmljYXRpb25NZXNzYWdlID0gYFBsYXllciBvbmUncyB0dXJuLmA7XG4gICAgaWYgKHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIgPT09IHRoaXMuZ2FtZS5wbGF5ZXJPbmUpIHtcbiAgICAgIC8vIElmIGdhbWUuYWN0aXZlUGxheWVyIGlzIE5PVCBwbGF5ZXJPbmVcbiAgICAgIC8vIFB1dCAnd2FpdCcgY2xhc3Mgb24gdGhlIHBsYXllciBvbmUncyBjb250YWluZXJcbiAgICAgIGNvbnNvbGUubG9nKGBQbGF5ZXIgdHdvIGF0dGFja3MgcGxheWVyIG9uZWApO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVIZWFkZXIudGV4dENvbnRlbnQgPSBgWW91ciBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyVHdvSGVhZGVyLnRleHRDb250ZW50ID0gYE9wcG9uZW50J3MgZ3JpZGA7XG4gICAgICB0aGlzLnBsYXllck9uZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd3YWl0Jyk7XG4gICAgICB0aGlzLnBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCd3YWl0Jyk7XG4gICAgICB0aGlzLnBsYXllck9uZUJvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Cb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coYFBsYXllciBvbmUgYXR0YWNrcyBwbGF5ZXIgdHdvYCk7XG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBPcHBvbmVudCdzIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgWW91ciBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgICAgbm90aWZpY2F0aW9uTWVzc2FnZSA9IGBQbGF5ZXIgdHdvJ3MgdHVybi5gO1xuICAgIH1cblxuICAgIHB1YlN1Yi5wdWJsaXNoKCdub3RpZnknLCBub3RpZmljYXRpb25NZXNzYWdlKTtcblxuICAgIGlmICghdGhpcy5tb2RlICYmIHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIgPT09IHRoaXMuZ2FtZS5wbGF5ZXJUd28pIHtcbiAgICAgIC8vIE9wdGlvbmFsLCBwdXQgYSBzZXRUaW1lb3V0KClcbiAgICAgIHRoaXMuZ2FtZS5wbGF5Um91bmQoKTtcbiAgICB9XG4gIH0sXG4gIGVuZEdhbWUobWVzc2FnZSkge1xuICAgIHRoaXMudW5iaW5kRXZlbnRzKCk7XG4gICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsIG1lc3NhZ2UpO1xuICAgIGNvbnNvbGUubG9nKGBnYW1lIGlzIG92ZXJgKTtcbiAgfSxcbiAgYm9hcmRIYW5kbGVyKGUpIHtcbiAgICBjb25zdCBidG4gPSBlLnRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgIGNvbnN0IHggPSBwYXJzZUludChidG4uZGF0YXNldC54KTtcbiAgICBjb25zdCB5ID0gcGFyc2VJbnQoYnRuLmRhdGFzZXQueSk7XG4gICAgaWYgKCFpc05hTih4KSB8fCAhaXNOYU4oeSkpIHtcbiAgICAgIGNvbnN0IGNlbGwgPSB0aGlzLmdhbWUuYWN0aXZlUGxheWVyLm9wcG9uZW50Qm9hcmQuZ2V0Qm9hcmRDZWxsKFt4LCB5XSk7XG4gICAgICBpZiAoY2VsbC5taXNzID09PSBmYWxzZSB8fCBjZWxsLmhpdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5nYW1lLnBsYXlSb3VuZChbeCwgeV0pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbn0pO1xuIiwiZXhwb3J0IGRlZmF1bHQgW1xuICB7XG4gICAgZWxlbWVudDogJ2RpdicsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgY2xhc3M6ICdwb3J0JyxcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdwJyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIHRleHRDb250ZW50OiAnRHJhZyB0aGUgc2hpcHMgdG8gdGhlIGdyaWQsIGFuZCB0aGVuIGNsaWNrIHRvIHJvdGF0ZTonLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICBjbGFzczogJ3BvcnRfbGluZXMnLFxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDhlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICc0JyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA4ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICczJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICczJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcyJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcyJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcyJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgICAgLy8gZHJhZ2dhYmxlOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgY2xhc3M6ICdidG5zX2NvbnRhaW5lcicsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGNsYXNzOiAncmVzZXQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnYnV0dG9uJyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBjbGFzczogJ3Jlc2V0X2J0bicsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1Jlc2V0JyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbl07XG4iLCJpbXBvcnQgR2FtZUNvbnRyb2xsZXIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9nYW1lQ29udHJvbGxlcic7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgY29tcG9zZUdhbWUgZnJvbSAnLi9jb21wb3NlR2FtZSc7XG5pbXBvcnQgcGxheUdhbWUgZnJvbSAnLi9wbGF5R2FtZSc7XG5pbXBvcnQgcG9ydENvbmZpZyBmcm9tICcuL3BvcnQuY29uZmlnJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL3BvcnQuY3NzJztcblxuLy8gVHJ5aW5nIHRvIGRlY2lkZSB3aGV0aGVyIG9yIG5vdCBpdCBpcyBhIGdvb2QgaWRlYSB0byBjcmVhdGUgYSBzZXBhcmF0ZSBtb2R1bGVcbi8vIHRvIGNvbnRyb2wgdGhlIHNjcmVlbiBhZnRlciBwbGF5ZXJzIGhhdmUgcGxhY2VkIGFsbCB0aGVpciBzaGlwc1xuLy8gYW5kIGFmdGVyIGEgJ3N0YXJ0JyBidXR0b24gaXMgY2xpY2tlZFxuZXhwb3J0IGRlZmF1bHQgKG1vZGUpID0+IHtcbiAgLy8gQnVpbGRzIGVtcHR5IGJvYXJkIGZvciBwbGF5ZXJzIHRvIHBsYWNlIHRoZWlyIHNoaXBzXG4gIC8vIG1vZGUgPT09IHRydWUgPT4gaHVtYW4gdnMgaHVtYW5cbiAgLy8gbW9kZSA9PT0gZmFsc2UgPT4gaHVtYW4gdnMgY29tcHV0ZXJcblxuICBjb25zdCBzY3JlZW5Db250cm9sbGVyID0ge1xuICAgIG1vZGUsXG4gICAgZ2FtZVJlYWR5OiBmYWxzZSxcbiAgICBnYW1lOiBHYW1lQ29udHJvbGxlcihtb2RlKSxcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy5ib2FyZHMgPSB7XG4gICAgICAgIHBsYXllck9uZTogdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLmJvYXJkLFxuICAgICAgICBwbGF5ZXJUd286IHRoaXMuZ2FtZS5wbGF5ZXJUd29Cb2FyZC5ib2FyZCxcbiAgICAgIH07XG4gICAgICBwdWJTdWIucHVibGlzaCgnbm90aWZ5JywgJ1BsYWNlIHNoaXBzJyk7XG4gICAgICB0aGlzLnVwZGF0ZUdhbWVTdGF0ZShjb21wb3NlR2FtZSk7XG4gICAgICB0aGlzLnN0YXJ0ID0gdGhpcy5zdGFydC5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5yZW5kZXJTaGlwID0gdGhpcy5yZW5kZXJTaGlwLmJpbmQodGhpcyk7XG4gICAgfSxcbiAgICB1cGRhdGVHYW1lU3RhdGUoY2FsbGJhY2spIHtcbiAgICAgIE9iamVjdC5hc3NpZ24odGhpcywgY2FsbGJhY2soKSk7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmdhbWVDb250YWluZXIgPSBlbGVtZW50O1xuICAgICAgdGhpcy5ib2FyZENvbnRhaW5lciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignI2JvYXJkX2NvbnRhaW5lcicpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVDb250YWluZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfb25lJyk7XG4gICAgICB0aGlzLnBsYXllclR3b0NvbnRhaW5lciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl90d28nKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfb25lID4gLmJvYXJkJyk7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX3R3byA+IC5ib2FyZCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVIZWFkZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfb25lID4gaDQnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvSGVhZGVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX3R3byA+IGg0Jyk7XG4gICAgICB0aGlzLnN0YXJ0QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuZ2FtZV9zdGFydF9idG4nKTtcbiAgICAgIHRoaXMucGxheWVyT25lQ2VsbHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5wbGF5ZXJfb25lID4gLmJvYXJkID4gLmNlbGwnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQ2VsbHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5wbGF5ZXJfdHdvID4gLmJvYXJkID4gLmNlbGwnKTtcblxuICAgICAgdGhpcy5zaGlwcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNoaXBfYm94Jyk7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgaWYgKCF0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICB0aGlzLmRyYWdTdGFydEhhbmRsZXIgPSB0aGlzLmRyYWdTdGFydEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kcmFnRW5kSGFuZGxlciA9IHRoaXMuZHJhZ0VuZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kcmFnTW92ZUhhbmRsZXIgPSB0aGlzLmRyYWdNb3ZlSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmRyb3BIYW5kbGVyID0gdGhpcy5kcm9wSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJvdGF0ZUhhbmRsZXIgPSB0aGlzLnJvdGF0ZUhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZXNldCA9IHRoaXMucmVzZXQuYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLnNoaXBzLmZvckVhY2goKHNoaXApID0+IHtcbiAgICAgICAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80MDQ2NDY5MC93YW50LXRvLXBlcmZvcm0tZGlmZmVyZW50LXRhc2stb24tbW91c2Vkb3duLWFuZC1jbGljay1ldmVudFxuICAgICAgICAgIHNoaXAuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5kcmFnU3RhcnRIYW5kbGVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCF0aGlzLm1vZGUpIHtcbiAgICAgICAgICB0aGlzLnN0YXJ0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zdGFydCk7XG4gICAgICAgIH1cbiAgICAgICAgcHViU3ViLnN1YnNjcmliZSgnZHJvcCcsIHRoaXMuZHJvcEhhbmRsZXIpO1xuICAgICAgICBwdWJTdWIuc3Vic2NyaWJlKCdyb3RhdGUnLCB0aGlzLnJvdGF0ZUhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIHRoaXMudXBkYXRlR2FtZVN0YXRlKHBsYXlHYW1lKTtcbiAgICAgICAgdGhpcy5yZW5kZXJBdHRhY2sgPSB0aGlzLnJlbmRlckF0dGFjay5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmVuZEdhbWUgPSB0aGlzLmVuZEdhbWUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJXYWl0ID0gdGhpcy5yZW5kZXJXYWl0LmJpbmQodGhpcyk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3JlbmRlckF0dGFjaycsIHRoaXMucmVuZGVyQXR0YWNrKTtcbiAgICAgICAgcHViU3ViLnN1YnNjcmliZSgnZW5kR2FtZScsIHRoaXMuZW5kR2FtZSk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3JlbmRlcldhaXQnLCB0aGlzLnJlbmRlcldhaXQpO1xuICAgICAgICB0aGlzLmJvYXJkSGFuZGxlciA9IHRoaXMuYm9hcmRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB9XG4gICAgICB0aGlzLnBsYXllck9uZUJvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Cb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGdhbWVDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdzZWN0aW9uJyk7XG4gICAgICBjb25zdCBib2FyZHNDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IHBsYXllck9uZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgcGxheWVyVHdvQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBwbGF5ZXJPbmVIZWFkZXIgPSBjcmVhdGVFbGVtZW50KCdoNCcpO1xuICAgICAgY29uc3QgcGxheWVyVHdvSGVhZGVyID0gY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgICAgIGNvbnN0IGdhbWVTdGFydENvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgZ2FtZVN0YXJ0QnRuID0gY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICBjb25zdCBnYW1lU3RhcnRCdG5UZXh0ID0gY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgZ2FtZVN0YXJ0QnRuVGV4dC50ZXh0Q29udGVudCA9ICdQbGF5JztcbiAgICAgIGdhbWVDb250YWluZXIuaWQgPSAnZ2FtZV9jb250YWluZXInO1xuICAgICAgYm9hcmRzQ29udGFpbmVyLmlkID0gJ2JvYXJkc19jb250YWluZXInO1xuICAgICAgcGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3BsYXllcl9vbmUnKTtcbiAgICAgIHBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdwbGF5ZXJfdHdvJyk7XG4gICAgICBwbGF5ZXJPbmVIZWFkZXIudGV4dENvbnRlbnQgPSAnWW91ciBncmlkJztcbiAgICAgIHBsYXllclR3b0hlYWRlci50ZXh0Q29udGVudCA9IGBPcHBvbmVudCdzIGdyaWRgO1xuICAgICAgZ2FtZVN0YXJ0Q29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2dhbWVfc3RhcnQnKTtcbiAgICAgIGdhbWVTdGFydEJ0bi5jbGFzc0xpc3QuYWRkKCdnYW1lX3N0YXJ0X2J0bicpO1xuICAgICAgLy8gUmVuZGVycyBwbGF5ZXJzJyBib2FyZHNcbiAgICAgIHBsYXllck9uZUNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlckJvYXJkKHRoaXMuYm9hcmRzLnBsYXllck9uZSkpO1xuICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyQm9hcmQodGhpcy5ib2FyZHMucGxheWVyVHdvKSk7XG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyT25lSGVhZGVyKTtcbiAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJUd29IZWFkZXIpO1xuICAgICAgYm9hcmRzQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllck9uZUNvbnRhaW5lcik7XG4gICAgICBib2FyZHNDb250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyVHdvQ29udGFpbmVyKTtcbiAgICAgIGdhbWVTdGFydEJ0bi5hcHBlbmRDaGlsZChnYW1lU3RhcnRCdG5UZXh0KTtcbiAgICAgIGdhbWVTdGFydENvbnRhaW5lci5hcHBlbmRDaGlsZChnYW1lU3RhcnRCdG4pO1xuICAgICAgaWYgKCF0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICBwb3J0Q29uZmlnLmZvckVhY2goKHBvcnQpID0+IHtcbiAgICAgICAgICBjb25zdCBwbGF5ZXJPbmVQb3J0ID0gY3JlYXRlRWxlbWVudChwb3J0LmVsZW1lbnQpO1xuICAgICAgICAgIHBsYXllck9uZVBvcnQuc2V0QXR0cmlidXRlcyhwb3J0LmF0dHJpYnV0ZXMpO1xuICAgICAgICAgIHBsYXllck9uZVBvcnQuc2V0Q2hpbGRyZW4ocG9ydC5jaGlsZHJlbik7XG4gICAgICAgICAgcGxheWVyT25lQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllck9uZVBvcnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5tb2RlKSB7XG4gICAgICAgICAgcG9ydENvbmZpZy5mb3JFYWNoKChwb3J0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwbGF5ZXJUd29Qb3J0ID0gY3JlYXRlRWxlbWVudChwb3J0LmVsZW1lbnQpO1xuICAgICAgICAgICAgcGxheWVyVHdvUG9ydC5zZXRBdHRyaWJ1dGVzKHBvcnQuYXR0cmlidXRlcyk7XG4gICAgICAgICAgICBwbGF5ZXJUd29Qb3J0LnNldENoaWxkcmVuKHBvcnQuY2hpbGRyZW4pO1xuICAgICAgICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllclR3b1BvcnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd3YWl0Jyk7XG4gICAgICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKGdhbWVTdGFydENvbnRhaW5lcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGdhbWVDb250YWluZXIuYXBwZW5kQ2hpbGQoYm9hcmRzQ29udGFpbmVyKTtcbiAgICAgIGlmICh0aGlzLmdhbWVSZWFkeSkgdGhpcy5nYW1lQ29udGFpbmVyLnJlcGxhY2VXaXRoKGdhbWVDb250YWluZXIpO1xuICAgICAgdGhpcy5jYWNoZURPTShnYW1lQ29udGFpbmVyKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgaWYgKCF0aGlzLmdhbWVSZWFkeSkgcmV0dXJuIGdhbWVDb250YWluZXI7XG4gICAgICAvLyBEb2VzIGhhdmluZyB0aGlzIGlmIHN0YXRlbWVudCBtYXR0ZXI/XG4gICAgfSxcbiAgICByZW5kZXJCb2FyZChib2FyZCkge1xuICAgICAgY29uc3QgcGxheWVyQm9hcmQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHBsYXllckJvYXJkLmNsYXNzTGlzdC5hZGQoJ2JvYXJkJyk7XG4gICAgICBib2FyZC5mb3JFYWNoKChyb3csIHkpID0+IHtcbiAgICAgICAgY29uc3QgYm9hcmRSb3cgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgYm9hcmRSb3cuY2xhc3NMaXN0LmFkZCgnYm9hcmRfcm93Jyk7XG4gICAgICAgIHJvdy5mb3JFYWNoKChjZWxsLCB4KSA9PiB7XG4gICAgICAgICAgY29uc3QgY2VsbEJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICAgIGNlbGxCdG4uc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICBjbGFzczogJ2NlbGwnLFxuICAgICAgICAgICAgWydkYXRhLXgnXTogeCArIDEsXG4gICAgICAgICAgICBbJ2RhdGEteSddOiByb3cubGVuZ3RoIC0geSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBOZWVkIHRvIHNob3cgb25seSBhY3RpdmVQbGF5ZXIncyBzaGlwc1xuICAgICAgICAgIC8vIE5lZWQgdG8gaGlkZSB0aGUgb3Bwb25lbnQncyBzaGlwcyB3aGVuIGFjdGl2ZVBsYXllciBjaGFuZ2VzXG4gICAgICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICBpZiAoY2VsbC5zaGlwKSB7XG4gICAgICAgICAgICAvLyBQcm9ibGVtLCBhbGxvd3Mgb3Bwb25lbnRzIHRvIGNoZWF0IGluIGEgYnJvd3NlciBkZXZlbG9wZXIgdG9vbHNcbiAgICAgICAgICAgIGNvbnN0IGNlbGxTaGlwID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBjZWxsU2hpcC5jbGFzc0xpc3QuYWRkKCdzaGlwJyk7XG4gICAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChjZWxsU2hpcCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNlbGxDb250ZW50LmNsYXNzTGlzdC5hZGQoJ2NlbGxfY29udGVudCcpO1xuICAgICAgICAgIGNlbGxCdG4uYXBwZW5kQ2hpbGQoY2VsbENvbnRlbnQpO1xuICAgICAgICAgIC8vIE5lZWQgdG8gY2hlY2sgZm9yIGxlZnQgYW5kIHRvcCBlZGdlcyBvZiBib2FyZFxuICAgICAgICAgIC8vIFRvIGNyZWF0ZSByb3cgYW5kIGNvbHVtbiBsYWJlbHNcbiAgICAgICAgICBpZiAoeCA9PT0gMCB8fCB5ID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByb3dNYXJrZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbE1hcmtlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgaWYgKHggPT09IDApIHtcbiAgICAgICAgICAgICAgcm93TWFya2VyLnNldEF0dHJpYnV0ZXMoeyBjbGFzczogJ3Jvd19tYXJrZXInLCB0ZXh0Q29udGVudDogYCR7eSArIDF9YCB9KTtcbiAgICAgICAgICAgICAgY2VsbENvbnRlbnQuYXBwZW5kQ2hpbGQocm93TWFya2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHkgPT09IDApIHtcbiAgICAgICAgICAgICAgY29sTWFya2VyLnNldEF0dHJpYnV0ZXMoe1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnY29sX21hcmtlcicsXG4gICAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyB4KX1gLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgY2VsbENvbnRlbnQuYXBwZW5kQ2hpbGQoY29sTWFya2VyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYm9hcmRSb3cuYXBwZW5kQ2hpbGQoY2VsbEJ0bik7XG4gICAgICAgICAgLy8gcGxheWVyQm9hcmQuYXBwZW5kQ2hpbGQoY2VsbEJ0bik7XG4gICAgICAgIH0pO1xuICAgICAgICBwbGF5ZXJCb2FyZC5hcHBlbmRDaGlsZChib2FyZFJvdyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwbGF5ZXJCb2FyZDtcbiAgICB9LFxuICB9O1xuICBzY3JlZW5Db250cm9sbGVyLmluaXQoKTtcbiAgcmV0dXJuIHNjcmVlbkNvbnRyb2xsZXIucmVuZGVyKCk7XG59O1xuIiwiaW1wb3J0IEdhbWVib2FyZCBmcm9tICcuL2dhbWVib2FyZCc7XG5pbXBvcnQgUGxheWVyIGZyb20gJy4vcGxheWVyJztcbmltcG9ydCBwaXBlIGZyb20gJy4vcGlwZSc7XG5pbXBvcnQgaXNIdW1hbiBmcm9tICcuL2lzSHVtYW4nO1xuaW1wb3J0IGlzQ29tcHV0ZXIgZnJvbSAnLi9pc0NvbXB1dGVyJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi9wdWJTdWInO1xuLy8gTW9kdWxlIHRoYXQgY29udHJvbHMgdGhlIG1haW4gZ2FtZSBsb29wXG4vLyBGb3Igbm93IGp1c3QgcG9wdWxhdGUgZWFjaCBHYW1lYm9hcmQgd2l0aCBwcmVkZXRlcm1pbmVkIGNvb3JkaW5hdGVzLlxuLy8gWW91IGFyZSBnb2luZyB0byBpbXBsZW1lbnQgYSBzeXN0ZW0gZm9yIGFsbG93aW5nIHBsYXllcnMgdG8gcGxhY2UgdGhlaXIgc2hpcHMgbGF0ZXIuXG5leHBvcnQgZGVmYXVsdCAobW9kZSkgPT4ge1xuICAvLyBJZiBtb2RlIGlzIHRydWUgcGxheWVyIHR3byB3aWxsIGJlIGEgaHVtYW4sIGVsc2UgYSBjb21wdXRlclxuICAvLyBUaGUgZ2FtZSBsb29wIHNob3VsZCBzZXQgdXAgYSBuZXcgZ2FtZSBieSBjcmVhdGluZyBQbGF5ZXJzIGFuZCBHYW1lYm9hcmRzLlxuICAvLyAxLiBDcmVhdGUgZ2FtZWJvYXJkc1xuICAvLyAyLiBDcmVhdGUgcGxheWVycyBhbmQgcGFzcyBpbiB0aGVpciBnYW1lYm9hcmQgYW5kIHRoZSBvcHBvbmVudCdzIGdhbWVib2FyZC5cbiAgLy8gIERvIEkgb25seSBuZWVkIHRvIHBhc3MgdGhlIG9wcG9uZW50J3MgYm9hcmQ/XG4gIC8vIGxldCBhY3RpdmVQbGF5ZXI7XG4gIGNvbnN0IHBsYXllck9uZUJvYXJkID0gR2FtZWJvYXJkKCk7XG4gIGNvbnN0IHBsYXllclR3b0JvYXJkID0gR2FtZWJvYXJkKCk7XG5cbiAgY29uc3QgcGxheWVyT25lID0gcGlwZShQbGF5ZXIsIGlzSHVtYW4pKHBsYXllck9uZUJvYXJkLCBwbGF5ZXJUd29Cb2FyZCk7XG4gIGNvbnN0IHBsYXllclR3byA9IHBpcGUoUGxheWVyLCBtb2RlID8gaXNIdW1hbiA6IGlzQ29tcHV0ZXIpKHBsYXllclR3b0JvYXJkLCBwbGF5ZXJPbmVCb2FyZCk7XG5cbiAgY29uc3QgcGxheWVycyA9IFtwbGF5ZXJPbmUsIHBsYXllclR3b107XG4gIGxldCBhY3RpdmVQbGF5ZXIgPSBwbGF5ZXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpXTtcblxuICBjb25zdCBzd2l0Y2hQbGF5ZXJzID0gKHBsYXllcikgPT4ge1xuICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgIC8vIExvb2tpbmcgaW50byBMb2Rhc2ggXy5pc0VxdWFsKClcbiAgICAgIC8vIENvdWxkIGFkZCBhIHR1cm4gcHJvcGVydHkgdG8gcGxheWVyIG9iamVjdCB0aGF0IHRha2VzIGEgYm9vbGVhblxuICAgICAgYWN0aXZlUGxheWVyID0gcGxheWVyID09PSBwbGF5ZXJPbmUgPyBwbGF5ZXJUd28gOiBwbGF5ZXJPbmU7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHBsYXlSb3VuZCA9IChjb29yZGluYXRlKSA9PiB7XG4gICAgLy8gQWxsb3cgYSBwbGF5ZXIgdG8gYXR0YWNrIGFnYWluIGlmIHRoZSBpbml0aWFsIGF0dGFjayBoaXRzIGEgc2hpcFxuICAgIGFjdGl2ZVBsYXllci5hdHRhY2soY29vcmRpbmF0ZSk7XG5cbiAgICBjb25zdCBzdGF0dXMgPSBnZXRHYW1lU3RhdHVzKCk7XG4gICAgaWYgKCFzdGF0dXMuc3RhdHVzKSB7XG4gICAgICAvLyBJZiBnYW1lIGlzIG5vdCBvdmVyLCBzd2l0Y2ggcGxheWVyc1xuICAgICAgc3dpdGNoUGxheWVycyhhY3RpdmVQbGF5ZXIpO1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ3JlbmRlcldhaXQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ2VuZEdhbWUnLCBzdGF0dXMubWVzc2FnZSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGdldEdhbWVTdGF0dXMgPSAoKSA9PiB7XG4gICAgY29uc3Qgc3RhdHVzID0geyBzdGF0dXM6IHBsYXllck9uZUJvYXJkLmdldFN0YXR1cygpIHx8IHBsYXllclR3b0JvYXJkLmdldFN0YXR1cygpIH07XG4gICAgaWYgKHN0YXR1cy5zdGF0dXMpIHtcbiAgICAgIC8vIEdhbWUgaXMgb3ZlclxuICAgICAgY29uc3QgbWVzc2FnZSA9IHBsYXllck9uZUJvYXJkLmdldFN0YXR1cygpID8gJ1BsYXllciB0d28gd29uIScgOiAnUGxheWVyIG9uZSB3b24hJztcbiAgICAgIE9iamVjdC5hc3NpZ24oc3RhdHVzLCB7IG1lc3NhZ2UgfSk7XG4gICAgfVxuICAgIHJldHVybiBzdGF0dXM7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBzd2l0Y2hQbGF5ZXJzLFxuICAgIHBsYXlSb3VuZCxcbiAgICBnZXRHYW1lU3RhdHVzLFxuICAgIGdldCBhY3RpdmVQbGF5ZXIoKSB7XG4gICAgICByZXR1cm4gYWN0aXZlUGxheWVyO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllck9uZSgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJPbmU7XG4gICAgfSxcbiAgICBnZXQgcGxheWVyVHdvKCkge1xuICAgICAgcmV0dXJuIHBsYXllclR3bztcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJPbmVCb2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJPbmVCb2FyZDtcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJUd29Cb2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJUd29Cb2FyZDtcbiAgICB9LFxuICB9O1xufTtcbiIsImltcG9ydCBTaGlwIGZyb20gJy4uL2NvbnRhaW5lcnMvc2hpcCc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4vcHViU3ViJztcbmltcG9ydCBnZW5lcmF0ZVVVSUQgZnJvbSAnLi4vaGVscGVycy9nZW5lcmF0ZVVVSUQnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIC8vIEtlZXAgdHJhY2sgb2YgbWlzc2VkIGF0dGFja3Mgc28gdGhleSBjYW4gZGlzcGxheSB0aGVtIHByb3Blcmx5LlxuICAvLyBCZSBhYmxlIHRvIHJlcG9ydCB3aGV0aGVyIG9yIG5vdCBhbGwgb2YgdGhlaXIgc2hpcHMgaGF2ZSBiZWVuIHN1bmsuXG4gIGNvbnN0IG1lbW8gPSBbXTtcbiAgY29uc3QgQ2VsbCA9IChzaGlwKSA9PiB7XG4gICAgcmV0dXJuIHNoaXBcbiAgICAgID8ge1xuICAgICAgICAgIHNoaXAsXG4gICAgICAgICAgaGl0OiBmYWxzZSxcbiAgICAgICAgICBhdHRhY2soKSB7XG4gICAgICAgICAgICB0aGlzLmhpdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnNoaXAuaGl0KCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgOiB7XG4gICAgICAgICAgbWlzczogZmFsc2UsXG4gICAgICAgICAgYXR0YWNrKCkge1xuICAgICAgICAgICAgdGhpcy5taXNzID0gdHJ1ZTtcbiAgICAgICAgICB9LFxuICAgICAgICB9O1xuICB9O1xuICBjb25zdCBib2FyZCA9IG5ldyBBcnJheSgxMCkuZmlsbCgpLm1hcCgoKSA9PiBuZXcgQXJyYXkoMTApLmZpbGwoKS5tYXAoKCkgPT4gQ2VsbCgpKSk7XG4gIC8vIDEwIHggMTAgZ3JpZFxuICAvLyBjb25zdCBib2FyZCA9IG5ldyBBcnJheSgxMCkuZmlsbCgpLm1hcCgoKSA9PiBuZXcgQXJyYXkoMTApLmZpbGwodW5kZWZpbmVkKSk7XG4gIC8qXG4gIFtcbiAgICAgICAgMSAgICAgMiAgICAgMyAgICAgNCAgICAgNSAgICAgNiAgICAgNyAgICAgOCAgICAgOSAgICAgMTBcbiAgMTAgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgMFxuICAwOSAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCAxXG4gIDA4ICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDJcbiAgMDcgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgM1xuICAwNiAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCA0XG4gIDA1ICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDVcbiAgMDQgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgNlxuICAwMyAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCA3XG4gIDAyICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDhcbiAgMDEgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgOVxuICAgICAgICAwICAgICAxICAgICAgMiAgICAzICAgICA0ICAgICA1ICAgICA2ICAgICA3ICAgICA4ICAgICA5XG4gIF1cbiAgKi9cbiAgY29uc3QgY2xlYXJCb2FyZCA9ICgpID0+IHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1lbW8ubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGNvbnN0IHsgcm93LCBjb2wgfSA9IG1lbW9baV07XG4gICAgICBjb25zb2xlLmxvZyhgcm93OiAke3Jvd30gfCBjb2w6ICR7Y29sfWApO1xuICAgICAgYm9hcmRbcm93XVtjb2xdID0gQ2VsbCgpO1xuICAgICAgbWVtby5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHBhcnNlQ29vcmRpbmF0ZSA9IChbeCwgeV0pID0+IHtcbiAgICAvLyBQYXJzZXMgY29vcmRpbmF0ZSBpbnB1dHRlZCBieSB1c2VyIHN1Y2ggdGhhdFxuICAgIC8vIHRoZSB2YWx1ZSBwYWlycyBjYW4gYmUgdXNlZCBmb3IgYWNjZXNzaW5nIGVsZW1lbnRzXG4gICAgLy8gaW4gdGhlIHR3byBkaW1lbnNpb25hbCBhcnJheVxuICAgIHJldHVybiBbYm9hcmQubGVuZ3RoIC0geSwgeCAtIDFdO1xuICB9O1xuXG4gIGNvbnN0IGdlbmVyYXRlUmFuZG9tQ29vcmRpbmF0ZSA9ICgpID0+IHtcbiAgICAvLyBSZXR1cm5zIHJhbmRvbSBjb29yZGluYXRlIHdpdGggdmFsdWVzIGJldHdlZW4gMSBhbmQgMTBcbiAgICBjb25zdCBjb29yZGluYXRlID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpICs9IDEpIHtcbiAgICAgIGNvb3JkaW5hdGUucHVzaChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCArIDEpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvb3JkaW5hdGU7XG4gIH07XG5cbiAgLy8gY29uc3QgZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlcyA9IChzaGlwcykgPT4ge1xuICAvLyAgIGNvbnN0IGNvb3JkaW5hdGVzID0gW107XG4gIC8vICAgLy8gR2VuZXJhdGUgYW4gYXJyYXkgb2YgdW5pcXVlIGNvb3JkaW5hdGVzXG4gIC8vICAgLy8gVGhlIGFycmF5IG11c3QgZXF1YWwgdG8gdGhlIGFtb3VudCBvZiBzaGlwc1xuICAvLyAgIGxldCBpID0gMDtcbiAgLy8gICB3aGlsZSAoaSA8IHNoaXBzLmxlbmd0aCkge1xuICAvLyAgICAgY29uc3QgW3gsIHldID0gZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4gIC8vICAgICBjb25zdCBvcmllbnRhdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpID09PSAxO1xuICAvLyAgICAgY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMoW3gsIHldKVxuICAvLyAgICAgY29uc3QgaXNWYWxpZENvb3JkaW5hdGUgPSBzaGlwQ29vcmRpbmF0ZXMoY2hlY2tCb2FyZCk7XG4gIC8vICAgICBpZiAoIWNvb3JkaW5hdGVzLmZpbmQoKFthLCBiXSkgPT4gYSA9PT0geCAmJiBiID09PSB5KSkge1xuICAvLyAgICAgICBjb29yZGluYXRlcy5wdXNoKFt4LCB5XSk7XG4gIC8vICAgICAgIGNvbnNvbGUubG9nKHNoaXBzW2ldKTtcbiAgLy8gICAgICAgaSArPSAxO1xuICAvLyAgICAgfSBlbHNlIHtcbiAgLy8gICAgICAgY29udGludWU7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBjb29yZGluYXRlcztcbiAgLy8gfTtcblxuICBjb25zdCBnZW5lcmF0ZVNoaXBDb29yZGluYXRlcyA9IChbeCwgeV0sIG9yaWVudGF0aW9uLCBzaGlwTGVuZ3RoKSA9PiB7XG4gICAgY29uc3QgY29vcmRpbmF0ZXMgPSBbXTtcblxuICAgIGlmIChvcmllbnRhdGlvbikge1xuICAgICAgLy8gVmVydGljYWxcbiAgICAgIC8vIFs1LCAzXSBpbiAyZCBhcnJheSB0ZXJtcyA9PiBbN11bNF0sIFs4XVs0XSwgWzldWzRdXG4gICAgICBmb3IgKGxldCBpID0geDsgaSA8IHggKyBzaGlwTGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29vcmRpbmF0ZXMucHVzaChbaSwgeV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIb3Jpem9udGFsXG4gICAgICAvLyBbNSwgM10gaW4gMmQgYXJyYXkgdGVybXMgPT4gWzddWzRdLCBbN11bNV0sIFs3XVs2XVxuICAgICAgZm9yIChsZXQgaSA9IHk7IGkgPCB5ICsgc2hpcExlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvb3JkaW5hdGVzLnB1c2goW3gsIGldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29vcmRpbmF0ZXM7XG4gIH07XG5cbiAgY29uc3QgdmFsaWRhdGVDb29yZGluYXRlID0gKHgsIHkpID0+IHtcbiAgICByZXR1cm4geCA+PSAwICYmIHggPCAxMCAmJiB5ID49IDAgJiYgeSA8IDEwO1xuICB9O1xuXG4gIGNvbnN0IGNoZWNrQm9hcmQgPSAoW3gsIHldLCBpZCkgPT4ge1xuICAgIC8vIENoZWNrIGlmIHRoZXJlIGlzIGEgc2hpcCBhdCB4IGFuZCB5XG4gICAgLy8gQ2hlY2sgaWYgYWxsIHN1cnJvdW5kaW5nIGNvb3JkaW5hdGVzIGFyZSB1bmRlZmluZWRcbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiBzaGlwIGNhbiBiZSBwbGFjZVxuICAgIGNvbnN0IGJvb2xlYW4gPSB2YWxpZGF0ZUNvb3JkaW5hdGUoeCwgeSk7XG4gICAgY29uc3QgY2hlY2sgPSBbXG4gICAgICBbeCwgeV0sXG4gICAgICBbeCwgeSArIDFdLFxuICAgICAgW3gsIHkgLSAxXSxcbiAgICAgIFt4ICsgMSwgeV0sXG4gICAgICBbeCArIDEsIHkgKyAxXSxcbiAgICAgIFt4ICsgMSwgeSAtIDFdLFxuICAgICAgW3ggLSAxLCB5XSxcbiAgICAgIFt4IC0gMSwgeSArIDFdLFxuICAgICAgW3ggLSAxLCB5IC0gMV0sXG4gICAgXTtcbiAgICByZXR1cm4gY2hlY2suZXZlcnkoKFthLCBiXSkgPT4ge1xuICAgICAgLy8gTmVlZCB0byBjaGVjayBpZiBhIGFuZCBiIGFyZSB3aXRoaW4gdGhlIGJvYXJkJ3Mgc2l6ZVxuICAgICAgLy8gVGhlIHZhbHVlIG9mIGEgYW5kIGIgY2FuIG9ubHkgYmUgYmV0d2VlbiBmcm9tIDAgdG8gOS5cbiAgICAgIC8vIEl0IGlzIHBvaW50bGVzcyB0byBjaGVjayBpZiB0aGVyZSBpcyBzcGFjZSB3aGVuIGEgc2hpcCBpcyBwbGFjZWQgYXQgdGhlIGJvcmRlciBvZiB0aGUgYm9hcmRcbiAgICAgIHJldHVybiB2YWxpZGF0ZUNvb3JkaW5hdGUoYSwgYilcbiAgICAgICAgPyBib29sZWFuICYmIChib2FyZFthXVtiXS5zaGlwID09PSB1bmRlZmluZWQgfHwgYm9hcmRbYV1bYl0uc2hpcC5pZCA9PT0gaWQpXG4gICAgICAgIDogYm9vbGVhbjtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBwbGFjZVNoaXAgPSAoY29vcmRpbmF0ZXMsIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCBpc0RyYWdnaW5nLCBpc1JvdGF0aW5nLCBpZCkgPT4ge1xuICAgIC8vIEhvdyBtYW55IHBhcmFtZXRlcnMgaXMgdG9vIG11Y2g/XG5cbiAgICAvLyBCZSBhYmxlIHRvIHBsYWNlIHNoaXBzIGF0IHNwZWNpZmljIGNvb3JkaW5hdGVzIGJ5IGNhbGxpbmcgdGhlIHNoaXAgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICAvLyBTaGlwIG11c3QgZml0IG9uIGJvYXJkIGJhc2VkIG9uIGNvb3JkaW5hdGVzXG4gICAgLy8gIFdoYXQgaWYgc2hpcCBjYW4gYmUgcm90YXRlZD9cbiAgICAvLyBJZiBzaGlwIGlzIGhvcml6b250YWxcbiAgICAvLyAgSW52b2x2ZXMgY29sdW1uc1xuICAgIC8vIElmIHNoaXAgaXMgdmVydGljYWxcbiAgICAvLyAgSW52b2x2ZXMgcm93c1xuICAgIC8vIEZvciBleGFtcGxlLCBpZiBzaGlwIGlzIGEgbGVuZ3RoIG9mIDUgQU5EIGhvcml6b250YWxcbiAgICAvLyAgW3gsIHldID0+IFs1LCAzXSA9PiBwbGFjZVNoaXAoWzUsIDNdKVxuICAgIC8vICBTaGlwIHNob3VsZCBiZSBvbiBib2FyZCBmcm9tIFs1LCAzXSB0byBbOSwgM11cbiAgICAvLyAgQmFzZWQgb24gYXJyYXkgPT4gYm9hcmRbN11bNF0gdG8gYm9hcmRbN11bOF1cbiAgICAvLyBXaGF0IGlmIGNvb3JkaW5hdGVzIGFyZSBiYXNlZCBvbiBkcmFnZ2FibGUgc2hpcHM/XG4gICAgLy8gIEhvdyB0byBkZXRlcm1pbmUgaWYgdGhlIHNoaXAgd2lsbCBmaXQgb24gdGhlIGJvYXJkP1xuICAgIC8vICBIb3cgdG8gaGFuZGxlIGlmIHRoZSBzaGlwIGRvZXMgbm90IGZpdCBvbiB0aGUgYm9hcmQ/XG4gICAgLy8gV2hhdCBpZiB0aGVyZSBpcyBhIHNoaXAgYWxyZWFkeSBhdCBnaXZlbiBjb29yZGluYXRlcz9cbiAgICAvLyBBIHNoaXAgTVVTVCBiZSAxIGNvb3JkaW5hdGUgYXdheSBmcm9tIGFub3RoZXIgc2hpcFxuXG4gICAgLy8gSWYgaWQgZXhpc3RzIG9uIGJvYXJkXG4gICAgLy8gIEZpbmQgdGhlIGNlbGxzIHdpdGggc2hpcC5pZCA9PT0gaWRcbiAgICAvLyAgUmVwbGFjZSBjZWxscyB3aXRoIENlbGwoKVxuICAgIC8vIG1lbW8gPSBtZW1vLmZpbHRlcigoY2VsbCkgPT4ge1xuICAgIC8vICAgaWYgKGNlbGwuaWQgPT09IGlkKSB7XG4gICAgLy8gICAgIGNvbnN0IHsgcm93LCBjb2wgfSA9IGNlbGw7XG4gICAgLy8gICAgIGJvYXJkW3Jvd11bY29sXSA9IENlbGwoKTtcbiAgICAvLyAgICAgcmV0dXJuIGZhbHNlO1xuICAgIC8vICAgfSBlbHNlIHtcbiAgICAvLyAgICAgcmV0dXJuIHRydWU7XG4gICAgLy8gICB9XG4gICAgLy8gfSk7XG5cbiAgICAvLyBjb25zdCBpc1NoaXBPbkJvYXJkID0gbWVtby5zb21lKChjZWxsKSA9PiBjZWxsLmlkID09PSBpZCk7XG4gICAgLy8gaWYgKGlzU2hpcE9uQm9hcmQpIHtcbiAgICAvLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWVtby5sZW5ndGg7IGkgKz0gMSkge1xuICAgIC8vICAgICBpZiAobWVtb1tpXS5pZCA9PT0gaWQpIHtcbiAgICAvLyAgICAgICBjb25zb2xlLmxvZyhgbWVtb1tpXS5pZDogJHttZW1vW2ldLmlkfWApO1xuICAgIC8vICAgICAgIGNvbnNvbGUubG9nKGBpZDogJHtpZH1gKTtcbiAgICAvLyAgICAgICBjb25zdCB7IHJvdywgY29sIH0gPSBtZW1vW2ldO1xuICAgIC8vICAgICAgIGJvYXJkW3Jvd11bY29sXSA9IENlbGwoKTtcbiAgICAvLyAgICAgICBtZW1vLnNwbGljZShpLCAxKTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIGNvbnN0IFt4LCB5XSA9IHBhcnNlQ29vcmRpbmF0ZShjb29yZGluYXRlcyk7XG4gICAgY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMoW3gsIHldLCBvcmllbnRhdGlvbiwgc2hpcExlbmd0aCk7XG4gICAgY29uc3QgaXNWYWxpZENvb3JkaW5hdGVzID0gc2hpcENvb3JkaW5hdGVzLmV2ZXJ5KChjb29yZGluYXRlKSA9PiB7XG4gICAgICByZXR1cm4gY2hlY2tCb2FyZChjb29yZGluYXRlLCBpZCk7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyguLi5zaGlwQ29vcmRpbmF0ZXMpO1xuICAgIGNvbnNvbGUubG9nKGlzVmFsaWRDb29yZGluYXRlcyk7XG4gICAgaWYgKGlzVmFsaWRDb29yZGluYXRlcyAmJiAhaXNEcmFnZ2luZykge1xuICAgICAgY29uc3QgbmV3U2hpcCA9IFNoaXAoc2hpcExlbmd0aCwgaWQpO1xuICAgICAgLy8gQ2hlY2sgaWYgeCBhbmQgeSBhcmUgd2l0aGluIHRoZSBib2FyZCdzIHNpemVcbiAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGlzIGEgc2hpcCBhdCB4IGFuZCB5XG5cbiAgICAgIGNvbnN0IGlzU2hpcE9uQm9hcmQgPSBtZW1vLnNvbWUoKGNlbGwpID0+IGNlbGwuaWQgPT09IGlkICYmIGlkICE9PSB1bmRlZmluZWQpO1xuICAgICAgaWYgKGlzU2hpcE9uQm9hcmQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW1vLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgaWYgKG1lbW9baV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgICBjb25zdCB7IHJvdywgY29sIH0gPSBtZW1vW2ldO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYHJvdzogJHtyb3d9IHwgY29sOiAke2NvbH1gKTtcbiAgICAgICAgICAgIGJvYXJkW3Jvd11bY29sXSA9IENlbGwoKTtcbiAgICAgICAgICAgIG1lbW8uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAob3JpZW50YXRpb24pIHtcbiAgICAgICAgLy8gVmVydGljYWxcbiAgICAgICAgZm9yIChsZXQgaSA9IHg7IGkgPCB4ICsgbmV3U2hpcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGJvYXJkW2ldW3ldID0gQ2VsbChuZXdTaGlwKTtcbiAgICAgICAgICBtZW1vLnB1c2goeyByb3c6IGksIGNvbDogeSwgaWQgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEhvcml6b250YWxcbiAgICAgICAgLy8gYm9hcmRbeF0uZmlsbChuZXdTaGlwLCB5LCB5ICsgbmV3U2hpcC5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0geTsgaSA8IHkgKyBuZXdTaGlwLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgYm9hcmRbeF1baV0gPSBDZWxsKG5ld1NoaXApO1xuICAgICAgICAgIG1lbW8ucHVzaCh7IHJvdzogeCwgY29sOiBpLCBpZCB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoaXNSb3RhdGluZykge1xuICAgICAgICBwdWJTdWIucHVibGlzaCgncm90YXRlJywgdHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwdWJTdWIucHVibGlzaCgnZHJvcCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVmFsaWRDb29yZGluYXRlcyAmJiBpc0RyYWdnaW5nICYmICFpc1JvdGF0aW5nKSB7XG4gICAgICBjb25zb2xlLmxvZygnZHJhZ2dpbmcnKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdkcm9wJywgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmICghaXNWYWxpZENvb3JkaW5hdGVzICYmIGlzRHJhZ2dpbmcgJiYgIWlzUm90YXRpbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKGB0aGVyZSBpcyBhIHNoaXAgb24gb3IgbmVhciBjb29yZGluYXRlc2ApO1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ2Ryb3AnLCB0cnVlLCBmYWxzZSk7XG4gICAgfSBlbHNlIGlmICghaXNWYWxpZENvb3JkaW5hdGVzICYmICFpc0RyYWdnaW5nICYmIGlzUm90YXRpbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBjYW5ub3Qgcm90YXRlYCk7XG4gICAgICBwdWJTdWIucHVibGlzaCgncm90YXRlJywgZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBwbGFjZVNoaXBzUmFuZG9tID0gKCkgPT4ge1xuICAgIGNvbnN0IHNoaXBzID0gWzQsIDMsIDMsIDIsIDIsIDIsIDEsIDEsIDEsIDFdO1xuICAgIGNvbnN0IGNvb3JkaW5hdGVzID0gW107XG4gICAgbGV0IGkgPSAwO1xuICAgIHdoaWxlIChpIDwgc2hpcHMubGVuZ3RoKSB7XG4gICAgICAvLyBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGUoKVxuICAgICAgY29uc3QgW3gsIHldID0gZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4gICAgICBjb25zdCBzaGlwQ29vcmRpbmF0ZXMgPSBnZW5lcmF0ZVNoaXBDb29yZGluYXRlcyhbeCwgeV0pO1xuICAgICAgY29uc3QgaXNWYWxpZENvb3JkaW5hdGUgPSBzaGlwQ29vcmRpbmF0ZXMuZXZlcnkoY2hlY2tCb2FyZCk7XG4gICAgICBpZiAoIWNvb3JkaW5hdGVzLmZpbmQoKFthLCBiXSkgPT4gYSA9PT0geCAmJiBiID09PSB5KSAmJiBpc1ZhbGlkQ29vcmRpbmF0ZSkge1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpID09PSAxO1xuICAgICAgICBwbGFjZVNoaXAoW3gsIHldLCBzaGlwc1tpXSwgb3JpZW50YXRpb24sIGZhbHNlLCBmYWxzZSwgZ2VuZXJhdGVVVUlEKCkpO1xuICAgICAgICBjb29yZGluYXRlcy5wdXNoKFt4LCB5XSk7XG4gICAgICAgIGNvbnNvbGUubG9nKHNoaXBzW2ldKTtcbiAgICAgICAgaSArPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGNvb3JkaW5hdGVzKTtcbiAgICBjb25zb2xlLmxvZyhib2FyZCk7XG4gICAgLy8gcGxhY2VTaGlwKGNvb3JkaW5hdGVzLCBzaGlwTGVuZ3RoLCBvcmllbnRhdGlvbiwgaXNEcmFnZ2luZywgaXNSb3RhdGUsIGlkKVxuICB9O1xuXG4gIGNvbnN0IHNob3RzID0gW107XG4gIGNvbnN0IHZhbGlkYXRlQXR0YWNrID0gKHgsIHkpID0+IHtcbiAgICAvLyBDaGVja3MgaWYgY29vcmRpbmF0ZSBpcyB3aXRoIHRoZSBib2FyZCBzaXplIGFuZCBoYXMgbm90IGJlZW4gYXR0YWNrZWRcbiAgICBjb25zdCBbYSwgYl0gPSBwYXJzZUNvb3JkaW5hdGUoW3gsIHldKTtcbiAgICByZXR1cm4gIXNob3RzLmZpbmQoKFthLCBiXSkgPT4gYSA9PT0geCAmJiBiID09PSB5KSAmJiB2YWxpZGF0ZUNvb3JkaW5hdGUoYSwgYik7XG4gIH07XG5cbiAgY29uc3QgcmVjZWl2ZUF0dGFjayA9IChbeCwgeV0pID0+IHtcbiAgICAvLyBIYXZlIGEgcmVjZWl2ZUF0dGFjayBmdW5jdGlvbiB0aGF0IHRha2VzIGEgcGFpciBvZiBjb29yZGluYXRlc1xuICAgIC8vIERldGVybWluZXMgd2hldGhlciBvciBub3QgdGhlIGF0dGFjayBoaXQgYSBzaGlwXG4gICAgLy8gVGhlbiBzZW5kcyB0aGUg4oCYaGl04oCZIGZ1bmN0aW9uIHRvIHRoZSBjb3JyZWN0IHNoaXAsIG9yIHJlY29yZHMgdGhlIGNvb3JkaW5hdGVzIG9mIHRoZSBtaXNzZWQgc2hvdC5cbiAgICAvLyBDYW4gSSBzdG9yZSB0aGUgbWlzc2VkIHNob3RzIGRpcmVjdGx5IG9uIHRoZSBib2FyZD9cbiAgICAvLyBIb3cgdG8gaGFuZGxlIGlmIGEgY29vcmRpbmF0ZSBoYXMgYWxyZWFkeSBiZWVuIGF0dGFja2VkP1xuICAgIC8vICBUaHJvdyBhbiBlcnJvcj9cblxuICAgIGNvbnN0IGNlbGwgPSBnZXRCb2FyZENlbGwoW3gsIHldKTtcbiAgICBjb25zdCBpc1ZhbGlkQXR0YWNrID0gdmFsaWRhdGVBdHRhY2soeCwgeSk7XG5cbiAgICBpZiAoaXNWYWxpZEF0dGFjaykge1xuICAgICAgY2VsbC5hdHRhY2soKTtcbiAgICAgIHNob3RzLnB1c2goW3gsIHldKTtcbiAgICAgIC8vIFB1Ymxpc2ggdG8gdGhlIHNjcmVlbkNvbnRyb2xsZXIucmVuZGVyQXR0YWNrIG1ldGhvZD9cbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdyZW5kZXJBdHRhY2snLCBjZWxsLCBbeCwgeV0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBnZXRTdGF0dXMgPSAoKSA9PiB7XG4gICAgLy8gUmVwb3J0cyB3aGV0aGVyIG9yIG5vdCBhbGwgb2YgdGhlaXIgc2hpcHMgaGF2ZSBiZWVuIHN1bmsuXG4gICAgY29uc3QgZmxhdEJvYXJkID0gYm9hcmQuZmxhdCgpLmZpbHRlcigoY2VsbCkgPT4gY2VsbC5zaGlwICE9PSB1bmRlZmluZWQpO1xuICAgIHJldHVybiBmbGF0Qm9hcmQuZXZlcnkoKGNlbGwpID0+IGNlbGwuc2hpcC5pc1N1bmsoKSk7XG4gIH07XG5cbiAgY29uc3QgZ2V0Qm9hcmRDZWxsID0gKFt4LCB5XSkgPT4ge1xuICAgIGNvbnN0IFthLCBiXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgIHJldHVybiBib2FyZFthXVtiXTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHJlY2VpdmVBdHRhY2ssXG4gICAgcGxhY2VTaGlwLFxuICAgIHBsYWNlU2hpcHNSYW5kb20sXG4gICAgZ2V0U3RhdHVzLFxuICAgIGdldEJvYXJkQ2VsbCxcbiAgICBjbGVhckJvYXJkLFxuICAgIGdldCBib2FyZCgpIHtcbiAgICAgIHJldHVybiBib2FyZDtcbiAgICB9LFxuICB9O1xufTtcblxuY29uc3QgbnVtYmVycyA9IFtcbiAgW1xuICAgIHtcbiAgICAgIG51bToge1xuICAgICAgICB2YWx1ZTogMSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBudW06IHtcbiAgICAgICAgdmFsdWU6IDIsXG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgbnVtOiB7XG4gICAgICAgIHZhbHVlOiAzLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG51bToge1xuICAgICAgICB2YWx1ZTogMSxcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbiAgW1xuICAgIHtcbiAgICAgIG51bToge1xuICAgICAgICB2YWx1ZTogOCxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBudW06IHtcbiAgICAgICAgdmFsdWU6IDEsXG4gICAgICB9LFxuICAgIH0sXG4gIF0sXG5dO1xuXG5jb25zdCBuYXIgPSB7IG51bTogeyB2YWx1ZTogMTk4NzM5ODc4OTI3MyB9IH07XG5jb25zdCBtZW1vID0gW107XG4vLyBudW1iZXJzWzBdWzRdID0gbmFyO1xuLy8gY29uc3QgcmVmID0gbnVtYmVyc1swXVs0XTtcbi8vIG1lbW8ucHVzaChyZWYpO1xuLy8gbWVtb1swXSA9IHt9O1xubWVtby5wdXNoKHsgeTogMCwgeDogNCB9KTtcbiIsIi8vIGV4cG9ydCBkZWZhdWx0IChwbGF5ZXIpID0+ICh7XG4vLyAgIC8vIE1ha2UgdGhlIOKAmGNvbXB1dGVy4oCZIGNhcGFibGUgb2YgbWFraW5nIHJhbmRvbSBwbGF5cy5cbi8vICAgLy8gVGhlIEFJIGRvZXMgbm90IGhhdmUgdG8gYmUgc21hcnQsXG4vLyAgIC8vIEJ1dCBpdCBzaG91bGQga25vdyB3aGV0aGVyIG9yIG5vdCBhIGdpdmVuIG1vdmUgaXMgbGVnYWxcbi8vICAgLy8gKGkuZS4gaXQgc2hvdWxkbuKAmXQgc2hvb3QgdGhlIHNhbWUgY29vcmRpbmF0ZSB0d2ljZSkuXG4vLyAgIHNob3RzOiBbXSxcbi8vICAgZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlOiAoKSA9PiB7XG4vLyAgICAgLy8gUmV0dXJucyByYW5kb20gY29vcmRpbmF0ZSB3aXRoIHZhbHVlcyBiZXR3ZWVuIDEgYW5kIDEwXG4vLyAgICAgY29uc3QgY29vcmRpbmF0ZSA9IFtdO1xuLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMjsgaSArPSAxKSB7XG4vLyAgICAgICBjb29yZGluYXRlLnB1c2goTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAgKyAxKSk7XG4vLyAgICAgfVxuLy8gICAgIHJldHVybiBjb29yZGluYXRlO1xuLy8gICB9LFxuLy8gICBhdHRhY2s6ICgpID0+IHtcbi8vICAgICAvLyBSZXR1cm5zIGEgcmFuZG9tIHVuaXF1ZSBjb29yZGluYXRlIHRoYXQgaXMgaW4tYm91bmRzIG9mIHRoZSBib2FyZFxuLy8gICAgIC8vIE5vdGUsIGlmIHNob3RzLmxlbmd0aCBpcyAxMDAsIGdhbWUgd2lsbCBiZSBvdmVyXG4vLyAgICAgLy8gVGhlcmUgYXJlIG9ubHkgMTAwIGNvb3JkaW5hdGVzIHRvIGF0dGFja1xuLy8gICAgIHdoaWxlIChwbGF5ZXIuc2hvdHMubGVuZ3RoIDwgMTAwKSB7XG4vLyAgICAgICBsZXQgW3gsIHldID0gcGxheWVyLmdlbmVyYXRlUmFuZG9tQ29vcmRpbmF0ZSgpO1xuLy8gICAgICAgaWYgKCFwbGF5ZXIuc2hvdHMuZmluZCgoW2EsIGJdKSA9PiBhID09PSB4ICYmIGIgPT09IHkpKSB7XG4vLyAgICAgICAgIHBsYXllci5vcHBvbmVudEJvYXJkLnJlY2VpdmVBdHRhY2soW3gsIHldKTtcbi8vICAgICAgICAgcGxheWVyLnNob3RzLnB1c2goW3gsIHldKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgIH0sXG4vLyB9KTtcblxuaW1wb3J0IGdlbmVyYXRlVVVJRCBmcm9tICcuLi9oZWxwZXJzL2dlbmVyYXRlVVVJRCc7XG5cbmV4cG9ydCBkZWZhdWx0IChwbGF5ZXIpID0+IHtcbiAgLy8gTWFrZSB0aGUg4oCYY29tcHV0ZXLigJkgY2FwYWJsZSBvZiBtYWtpbmcgcmFuZG9tIHBsYXlzLlxuICAvLyBUaGUgQUkgZG9lcyBub3QgaGF2ZSB0byBiZSBzbWFydCxcbiAgLy8gQnV0IGl0IHNob3VsZCBrbm93IHdoZXRoZXIgb3Igbm90IGEgZ2l2ZW4gbW92ZSBpcyBsZWdhbFxuICAvLyAoaS5lLiBpdCBzaG91bGRu4oCZdCBzaG9vdCB0aGUgc2FtZSBjb29yZGluYXRlIHR3aWNlKS5cblxuICBjb25zdCBzaG90cyA9IFtdO1xuICBjb25zdCBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGUgPSAoKSA9PiB7XG4gICAgLy8gUmV0dXJucyByYW5kb20gY29vcmRpbmF0ZSB3aXRoIHZhbHVlcyBiZXR3ZWVuIDEgYW5kIDEwXG4gICAgY29uc3QgY29vcmRpbmF0ZSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMjsgaSArPSAxKSB7XG4gICAgICBjb29yZGluYXRlLnB1c2goTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAgKyAxKSk7XG4gICAgfVxuICAgIHJldHVybiBjb29yZGluYXRlO1xuICB9O1xuXG4gIGNvbnN0IGF0dGFjayA9ICgpID0+IHtcbiAgICAvLyBSZXR1cm5zIGEgcmFuZG9tIHVuaXF1ZSBjb29yZGluYXRlIHRoYXQgaXMgaW4tYm91bmRzIG9mIHRoZSBib2FyZFxuICAgIC8vIE5vdGUsIGlmIHNob3RzLmxlbmd0aCBpcyAxMDAsIGdhbWUgd2lsbCBiZSBvdmVyXG4gICAgLy8gVGhlcmUgYXJlIG9ubHkgMTAwIGNvb3JkaW5hdGVzIHRvIGF0dGFja1xuICAgIHdoaWxlIChzaG90cy5sZW5ndGggPCAxMDApIHtcbiAgICAgIGxldCBbeCwgeV0gPSBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGUoKTtcbiAgICAgIGlmICghc2hvdHMuZmluZCgoW2EsIGJdKSA9PiBhID09PSB4ICYmIGIgPT09IHkpKSB7XG4gICAgICAgIHBsYXllci5vcHBvbmVudEJvYXJkLnJlY2VpdmVBdHRhY2soW3gsIHldKTtcbiAgICAgICAgc2hvdHMucHVzaChbeCwgeV0pO1xuICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4geyBhdHRhY2sgfTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAocGxheWVyKSA9PiAoe1xuICBhdHRhY2s6IChbeCwgeV0pID0+IHtcbiAgICBwbGF5ZXIub3Bwb25lbnRCb2FyZC5yZWNlaXZlQXR0YWNrKFt4LCB5XSk7XG4gICAgcmV0dXJuIFt4LCB5XTtcbiAgfSxcbn0pO1xuIiwiLy8gQXJ0aWNsZXMgYWJvdXQgbG9vc2VseSBjb3VwbGluZyBvYmplY3QgaW5oZXJpdGFuY2Ugd2l0aCBmYWN0b3J5IGZ1bmN0aW9ucyBhbmQgcGlwZVxuLy8gaHR0cHM6Ly9tZWRpdW0uY29tL2RhaWx5anMvYnVpbGRpbmctYW5kLWNvbXBvc2luZy1mYWN0b3J5LWZ1bmN0aW9ucy01MGZlOTAxNDEzNzRcbi8vIGh0dHBzOi8vd3d3LmZyZWVjb2RlY2FtcC5vcmcvbmV3cy9waXBlLWFuZC1jb21wb3NlLWluLWphdmFzY3JpcHQtNWIwNDAwNGFjOTM3L1xuLy8gT2JzZXJ2YXRpb246IGlmIHRoZXJlIGlzIG5vIGluaXRpYWwgdmFsdWUsIHRoZSBmaXJzdCBmdW5jdGlvbiBkb2VzIG5vdCBydW5cbmV4cG9ydCBkZWZhdWx0IChpbml0aWFsRm4sIC4uLmZucykgPT5cbiAgKC4uLnZhbHVlcykgPT4ge1xuICAgIHJldHVybiBmbnMucmVkdWNlKChvYmosIGZuKSA9PiB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIGZuKG9iaikpO1xuICAgIH0sIGluaXRpYWxGbih2YWx1ZXMpKTtcbiAgfTtcbiIsIi8vIFBsYXllcnMgY2FuIHRha2UgdHVybnMgcGxheWluZyB0aGUgZ2FtZSBieSBhdHRhY2tpbmcgdGhlIGVuZW15IEdhbWVib2FyZC5cbi8vIFRoZSBnYW1lIGlzIHBsYXllZCBhZ2FpbnN0IHRoZSBjb21wdXRlcixcblxuLy8gRG9lcyBlYWNoIHBsYXllciBoYXZlIHRoZWlyIG93biBnYW1lYm9hcmQ/XG4vLyBEb2VzIGVhY2ggcGxheWVyIGhhdmUgYWNjZXNzIHRvIHRoZSBvcHBvbmVudCdzIGdhbWVib2FyZD9cbi8vIEhvdyB0byBkZWNpZGUgaWYgZ2FtZSBpcyBwbGF5ZXIgdnMgcGxheWVyIGFuZCBwbGF5ZXIgdnMgY29tcHV0ZXI/XG5leHBvcnQgZGVmYXVsdCAoW3BsYXllckJvYXJkLCBvcHBvbmVudEJvYXJkXSkgPT4ge1xuICAvLyBjb25zdCBib2FyZCA9IHBsYXllckJvYXJkO1xuICAvLyBEbyBJIG5lZWQgdG8gZGVjbGFyZSB0aGUgY29uc3QgdmFyaWFibGU/XG4gIGNvbnN0IHN0YXRlID0ge1xuICAgIGdldCBvcHBvbmVudEJvYXJkKCkge1xuICAgICAgcmV0dXJuIG9wcG9uZW50Qm9hcmQ7XG4gICAgfSxcbiAgICBnZXQgYm9hcmQoKSB7XG4gICAgICByZXR1cm4gcGxheWVyQm9hcmQ7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKlxuY29uc3QgcGlwZSA9IChpbml0aWFsRm4sIC4uLmZucykgPT4ge1xuICByZXR1cm4gZm5zLnJlZHVjZSgob2JqLCBmbikgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgZm4ob2JqKSk7XG4gIH0sIGluaXRpYWxGbigpKTtcbn07XG5cbmNvbnN0IEFuaW1hbCA9ICgpID0+IHtcbiAgbGV0IHdlaWdodDtcblxuICBjb25zdCBzdGF0ZSA9IHtcbiAgICB3ZWlnaHQsXG4gICAgaW5mbzogKCkgPT4gKHtcbiAgICAgIHdlaWdodDogc3RhdGUud2VpZ2h0LFxuICAgICAgbGVnczogc3RhdGUubGVncyxcbiAgICB9KSxcbiAgfTtcbiAgcmV0dXJuIHN0YXRlO1xufTtcblxuY29uc3QgQ2F0ID0gKHN0YXRlKSA9PiAoe1xuICB0eXBlOiAnY2F0JyxcbiAgbGVnczogNCxcbiAgc3BlYWs6ICgpID0+IGBtZW93LCBJIGhhdmUgJHtzdGF0ZS5sZWdzfSBsZWdzYCxcbiAgcG9vcDogKCkgPT4gYG1lb3cuLi5JIGFtIHBvb3BpbmcuYCxcbiAgcG9vcEFnYWluOiAoKSA9PiBgJHtzdGF0ZS5wb29wKCl9IG1lb3cgbWVvdy4uLkkgYW0gcG9vcGluZyBvbmNlIG1vcmVgLFxufSk7XG5cbmNvbnN0IEJpcmQgPSAoc3RhdGUpID0+ICh7XG4gIHR5cGU6ICdiaXJkJyxcbiAgbGVnczogMixcbiAgc3BlYWs6ICgpID0+IGBjaGlycC4uLmNoaXJwLCBJIGhhdmUgJHtzdGF0ZS5sZWdzfSBsZWdzYCxcbiAgcG9vcDogKCkgPT4gYGNoaXJwLi4uSSBhbSBwb29waW5nLmAsXG4gIHBvb3BBZ2FpbjogKCkgPT4gYCR7c3RhdGUucG9vcCgpfSBjaGlycCBjaGlycC4uLkkgYW0gcG9vcGluZyBvbmNlIG1vcmVgLFxufSk7XG5cbmNvbnN0IFdpemFyZCA9IChzdGF0ZSkgPT4gKHtcbiAgZmlyZWJhbGw6ICgpID0+IGAke3N0YXRlLnR5cGV9IGlzIGNhc3RpbmcgZmlyZWJhbGxgLFxufSk7XG5cbmNvbnN0IE5lY3JvbWFuY2VyID0gKHN0YXRlKSA9PiAoe1xuICBkZWZpbGVEZWFkOiAoKSA9PiBgJHtzdGF0ZS50eXBlfSBpcyBjYXN0aW5nIGRlZmlsZSBkZWFkYCxcbn0pO1xuXG5jb25zdCBjYXQgPSBwaXBlKEFuaW1hbCwgQ2F0LCBXaXphcmQpO1xuY29uc3QgYmlyZCA9IHBpcGUoQW5pbWFsLCBCaXJkLCBOZWNyb21hbmNlcik7XG5jb25zb2xlLmxvZyhjYXQuZmlyZWJhbGwoKSk7XG5jb25zb2xlLmxvZyhjYXQuc3BlYWsoKSk7XG5jb25zb2xlLmxvZyhjYXQuaW5mbygpKTtcbmNhdC53ZWlnaHQgPSAxMDtcbmNvbnNvbGUubG9nKGNhdC5pbmZvKCkpO1xuY29uc29sZS5sb2coYmlyZC5kZWZpbGVEZWFkKCkpO1xuY29uc29sZS5sb2coYmlyZC5zcGVhaygpKTtcbmNvbnNvbGUubG9nKGJpcmQuaW5mbygpKTtcbmJpcmQud2VpZ2h0ID0gMztcbmNvbnNvbGUubG9nKGJpcmQuaW5mbygpKTtcbiovXG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIHN1YnNjcmliZXJzOiB7fSxcbiAgc3Vic2NyaWJlKHN1YnNjcmliZXIsIGZuKSB7XG4gICAgLy8gV2hlbiB3b3VsZCB5b3Ugd2FudCB0byBzdWJzY3JpYmUgYSBzaW5nbGUgZnVuY3Rpb24gaW4gdGhlIHNhbWUgc3Vic2NyaWJlciBtb3JlIHRoYW4gb25jZT9cbiAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdID0gdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXSB8fCBbXTtcbiAgICBpZiAoIXRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uZmluZCgoaGFuZGxlcikgPT4gaGFuZGxlci5uYW1lID09PSBmbi5uYW1lKSkge1xuICAgICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5wdXNoKGZuKTtcbiAgICB9XG4gIH0sXG4gIHVuc3Vic2NyaWJlKHN1YnNjcmliZXIsIGZuKSB7XG4gICAgaWYgKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0pIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uc3BsaWNlKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uaW5kZXhPZihmbiksIDEpO1xuICAgICAgaWYgKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0ubGVuZ3RoID09PSAwKSBkZWxldGUgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXTtcbiAgICB9XG4gIH0sXG4gIHB1Ymxpc2goc3Vic2NyaWJlciwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmZvckVhY2goKGZuKSA9PiBmbiguLi5hcmdzKSk7XG4gICAgfVxuICB9LFxufTtcbiIsImV4cG9ydCBkZWZhdWx0IChzaGlwTGVuZ3RoLCBzaGlwSUQpID0+IHtcbiAgLy8gUHJvcGVydGllczpcbiAgLy8gIExlbmd0aFxuICAvLyAgTnVtYmVycyBvZiB0aW1lcyBoaXRcbiAgLy8gIFN1bmsgKHRydWUvZmFsc2UpXG4gIC8vIE1ldGhvZHM6XG4gIC8vICBIaXQsIGluY3JlYXNlcyB0aGUgbnVtYmVyIG9mIOKAmGhpdHPigJkgaW4geW91ciBzaGlwLlxuICAvLyAgaXNTdW5rKCkgY2FsY3VsYXRlcyB3aGV0aGVyIGEgc2hpcCBpcyBjb25zaWRlcmVkIHN1bmtcbiAgLy8gICAgQmFzZWQgb24gaXRzIGxlbmd0aCBhbmQgdGhlIG51bWJlciBvZiBoaXRzIGl0IGhhcyByZWNlaXZlZC5cbiAgLy8gLSBDYXJyaWVyXHQgICAgNVxuICAvLyAtIEJhdHRsZXNoaXBcdCAgNFxuICAvLyAtIERlc3Ryb3llclx0ICAzXG4gIC8vIC0gU3VibWFyaW5lXHQgIDNcbiAgLy8gLSBQYXRyb2wgQm9hdFx0MlxuICAvLyBjb25zdCBsZW5ndGggPSBzaXplO1xuICAvLyBIb3cgb3Igd2hlbiB0byBpbml0aWFsaXplIGEgc2hpcCdzIGxlbmd0aFxuICAvLyBXaGF0IGRldGVybWluZXMgYSBzaGlwcyBsZW5ndGg/XG4gIGNvbnN0IGxlbmd0aCA9IHNoaXBMZW5ndGg7XG4gIGNvbnN0IGlkID0gc2hpcElEO1xuICBsZXQgbnVtSGl0cyA9IDA7XG4gIGxldCBzdW5rID0gZmFsc2U7XG4gIGNvbnN0IGhpdCA9ICgpID0+IHtcbiAgICBpZiAoIXN1bmspIG51bUhpdHMgKz0gMTtcbiAgfTtcbiAgY29uc3QgaXNTdW5rID0gKCkgPT4ge1xuICAgIHN1bmsgPSBudW1IaXRzID09PSBsZW5ndGg7XG4gICAgcmV0dXJuIHN1bms7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBoaXQsXG4gICAgaXNTdW5rLFxuICAgIGdldCBsZW5ndGgoKSB7XG4gICAgICByZXR1cm4gbGVuZ3RoO1xuICAgIH0sXG4gICAgZ2V0IGlkKCkge1xuICAgICAgcmV0dXJuIGlkO1xuICAgIH0sXG4gIH07XG59O1xuIiwiaW1wb3J0IGdlbmVyYXRlVVVJRCBmcm9tICcuL2dlbmVyYXRlVVVJRCc7XG5cbmNvbnN0IEJ1aWxkRWxlbWVudCA9IChzdGF0ZSkgPT4gKHtcbiAgc2V0QXR0cmlidXRlczogKGF0dHJpYnV0ZXMpID0+IHtcbiAgICBPYmplY3QuZW50cmllcyhhdHRyaWJ1dGVzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmIChrZXkgIT09ICd0ZXh0Q29udGVudCcpIHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzJykge1xuICAgICAgICAgIHN0YXRlLnNldENsYXNzTmFtZSh2YWx1ZS5zcGxpdCgvXFxzLykpO1xuICAgICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgIHN0YXRlLnNldFN0eWxlKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChrZXkgPT09ICdkYXRhLWlkJykge1xuICAgICAgICAgIHN0YXRlLnNldEF0dHJpYnV0ZShrZXksIGdlbmVyYXRlVVVJRCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZS5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnNldFRleHRDb250ZW50KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgc2V0U3R5bGU6ICh0ZXh0KSA9PiB7XG4gICAgc3RhdGUuc3R5bGUuY3NzVGV4dCA9IHRleHQ7XG4gIH0sXG4gIHNldENsYXNzTmFtZTogKGFyckNsYXNzKSA9PiB7XG4gICAgYXJyQ2xhc3MuZm9yRWFjaCgoY2xhc3NOYW1lKSA9PiBzdGF0ZS5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSkpO1xuICB9LFxuICBzZXRUZXh0Q29udGVudDogKHRleHQpID0+IHtcbiAgICBzdGF0ZS50ZXh0Q29udGVudCA9IHRleHQ7XG4gIH0sXG4gIHNldENoaWxkcmVuOiAoY2hpbGRyZW4pID0+IHtcbiAgICBjaGlsZHJlbi5mb3JFYWNoKChjaGlsZCkgPT4ge1xuICAgICAgY29uc3QgY2hpbGRFbGVtZW50ID0gY3JlYXRlRWxlbWVudChjaGlsZC5lbGVtZW50KTtcbiAgICAgIGlmIChjaGlsZC5hdHRyaWJ1dGVzICYmIGNoaWxkLmF0dHJpYnV0ZXMuY29uc3RydWN0b3IubmFtZSA9PT0gJ09iamVjdCcpIHtcbiAgICAgICAgY2hpbGRFbGVtZW50LnNldEF0dHJpYnV0ZXMoY2hpbGQuYXR0cmlidXRlcyk7XG4gICAgICB9XG4gICAgICBpZiAoY2hpbGQuY2hpbGRyZW4pIHtcbiAgICAgICAgLy8gV2hhdCBpZiBjaGlsZCBvZiBjaGlsZC5jaGlsZHJlbiBoYXMgY2hpbGRyZW4/XG4gICAgICAgIGNoaWxkRWxlbWVudC5zZXRDaGlsZHJlbihjaGlsZC5jaGlsZHJlbik7XG4gICAgICB9XG4gICAgICBzdGF0ZS5hcHBlbmRDaGlsZChjaGlsZEVsZW1lbnQpO1xuICAgIH0pO1xuICB9LFxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnKSB7XG4gIGNvbnN0IGh0bWxFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWcpO1xuXG4gIHJldHVybiBPYmplY3QuYXNzaWduKGh0bWxFbGVtZW50LCBCdWlsZEVsZW1lbnQoaHRtbEVsZW1lbnQpKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgNiBjaGFyYWN0ZXJzIGZyb20gY3J5cHRvLnJhbmRvbVVVSUQoKVxuICAvLyBQc2V1ZG8tcmFuZG9tbHkgY2hhbmdlcyBhIGxvd2VyY2FzZSBsZXR0ZXIgdG8gdXBwZXJjYXNlXG4gIGNvbnN0IHV1aWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICByZXR1cm4gWy4uLnV1aWQuc3Vic3RyaW5nKDAsIHV1aWQuaW5kZXhPZignLScpKV0ucmVkdWNlKCh3b3JkLCBjdXJyZW50Q2hhcikgPT4ge1xuICAgIGNvbnN0IGNoZWNrID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMik7XG4gICAgaWYgKGNoZWNrID09IGZhbHNlICYmIGN1cnJlbnRDaGFyLm1hdGNoKC9bYS16XS8pKSB7XG4gICAgICByZXR1cm4gd29yZCArIGN1cnJlbnRDaGFyLnRvVXBwZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiB3b3JkICsgY3VycmVudENoYXI7XG4gIH0pO1xufTtcblxuLypcbk9wdGlvbmFsIHdheSBub3QgdXNpbmcgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpXG5jb25zdCBnZW5lcmF0ZVVVSUQgPSAoKSA9PiB7XG4gIGNvbnN0IHV1aWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgIHJldHVybiBbLi4udXVpZC5zdWJzdHJpbmcoMCwgdXVpZC5pbmRleE9mKCctJykpXS5tYXAoKGNoYXIpID0+IHtcbiAgICAgIGNvbnN0IGNoZWNrID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMik7XG4gICAgICBpZiAoY2hlY2sgPT0gZmFsc2UgJiYgY2hhci5tYXRjaCgvW2Etel0vKSkge1xuICAgICAgICByZXR1cm4gY2hhci50b1VwcGVyQ2FzZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNoYXI7XG4gICAgfSkuam9pbignJyk7XG59O1xuKi9cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==