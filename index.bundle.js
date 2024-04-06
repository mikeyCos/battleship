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
  margin: 40px auto;
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
`, "",{"version":3,"sources":["webpack://./src/styles/notifications.css"],"names":[],"mappings":"AAAA;EACE;4BAC0B;;EAE1B,WAAW;EACX,OAAO;EACP,MAAM;EACN,kBAAkB;AACpB;;AAEA;EACE;kBACgB;EAChB,aAAa;EACb,uBAAuB;EACvB,iBAAiB;EACjB,UAAU;EACV,mBAAmB;EACnB,mBAAmB;EACnB,cAAc;EACd,iBAAiB;AACnB;;AAEA;EACE,YAAY;EACZ,YAAY;EACZ,oCAAoC;AACtC;;AAEA;EACE,aAAa;EACb,gCAAgC;EAChC,sBAAsB;EACtB,SAAS;AACX;;AAEA;EACE,gCAAgC;EAChC,qBAAqB;EACrB,iCAAiC;EACjC,2BAA2B;EAC3B,kBAAkB;EAClB,uCAAuC;AACzC;;AAEA;EACE,0CAA0C;EAC1C,oCAAoC;AACtC","sourcesContent":["#notifications_container {\n  /* display: flex;\n  justify-content: center; */\n\n  width: 100%;\n  left: 0;\n  top: 0;\n  position: absolute;\n}\n\n#notifications_container > .notification_wrapper {\n  /* width: 30%;\n  padding: 1rem; */\n  display: flex;\n  justify-content: center;\n  margin: 40px auto;\n  width: 40%;\n  height: max-content;\n  background: #f8f8f8;\n  padding: 0.5em;\n  user-select: none;\n}\n\n#notifications_container.gameover {\n  height: 100%;\n  z-index: 999;\n  background: rgba(255, 255, 255, 0.5);\n}\n\n#notifications_container.gameover > .notification_wrapper {\n  padding: 1rem;\n  background-color: rgb(8, 195, 8);\n  flex-direction: column;\n  gap: 1rem;\n}\n\n.notification_wrapper > .play_again {\n  color: var(--color-font-primary);\n  text-decoration: none;\n  padding: var(--padding-small-btn);\n  background-color: lightgray;\n  width: max-content;\n  border-radius: var(--border-radius-btn);\n}\n\n.notification_wrapper > .play_again:hover {\n  box-shadow: 0rem 0rem 0.3rem -0.1rem black;\n  background: rgba(255, 255, 255, 0.6);\n}\n"],"sourceRoot":""}]);
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
  border-width: 3px;
  border-color: #40bf44;
  background: rgba(64, 191, 68, 0.05);
}

.rotate_error {
  border-color: red;
  animation: linear 0.005s infinite shake;
}

.btns_container {
  display: flex;
  margin-top: 1rem;
  gap: 0.25rem;
}

.btns_container > * button {
  padding: 0.5rem 1rem;
}

.reset_btn.inactive {
  pointer-events: none;
}

.reset_btn.inactive > span {
  opacity: 0.5;
}

.random_btn {
  display: none;
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
`, "",{"version":3,"sources":["webpack://./src/styles/port.css"],"names":[],"mappings":"AAAA;EACE,aAAa;AACf;;AAEA;EACE,kBAAkB;EAClB,0BAA0B;EAC1B,aAAa;EACb,6BAA6B;AAC/B;;AAEA;EACE,UAAU;EACV,kBAAkB;EAClB,iCAAiC;EACjC,sBAAsB;EACtB,OAAO;EACP,MAAM;EACN,6BAA6B;AAC/B;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,6CAA6C;EAC7C,SAAS;EACT,QAAQ;AACV;;AAEA;EACE,uBAAuB;EACvB,mBAAmB;AACrB;;AAEA;EACE,iBAAiB;EACjB,qBAAqB;EACrB,mCAAmC;AACrC;;AAEA;EACE,iBAAiB;EACjB,uCAAuC;AACzC;;AAEA;EACE,aAAa;EACb,gBAAgB;EAChB,YAAY;AACd;;AAEA;EACE,oBAAoB;AACtB;;AAEA;EACE,oBAAoB;AACtB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,aAAa;AACf;;AAEA;EACE;IACE,UAAU;EACZ;;EAEA;IACE,SAAS;EACX;;EAEA;IACE,SAAS;EACX;AACF","sourcesContent":[".port_lines {\n  display: flex;\n}\n\n.port_ship {\n  position: relative;\n  border: 1px dotted #b2b2b9;\n  margin: 0.5em;\n  /* box-sizing: content-box; */\n}\n\n.ship_box {\n  z-index: 2;\n  position: absolute;\n  background: rgba(0, 0, 255, 0.05);\n  border: 2px solid #00f;\n  left: 0;\n  top: 0;\n  /* box-sizing: content-box; */\n}\n\n.ship_box:hover {\n  cursor: move;\n}\n\n.cell_content > .ship_box {\n  /* Comment out if using box-sizing: content */\n  left: -4%;\n  top: -4%;\n}\n\n.ship_box.dragging.ship_box_transparent {\n  background: transparent;\n  border: transparent;\n}\n\n.ship_box_placeholder {\n  border-width: 3px;\n  border-color: #40bf44;\n  background: rgba(64, 191, 68, 0.05);\n}\n\n.rotate_error {\n  border-color: red;\n  animation: linear 0.005s infinite shake;\n}\n\n.btns_container {\n  display: flex;\n  margin-top: 1rem;\n  gap: 0.25rem;\n}\n\n.btns_container > * button {\n  padding: 0.5rem 1rem;\n}\n\n.reset_btn.inactive {\n  pointer-events: none;\n}\n\n.reset_btn.inactive > span {\n  opacity: 0.5;\n}\n\n.random_btn {\n  display: none;\n}\n\n.ready_btn.inactive {\n  display: none;\n}\n\n@keyframes shake {\n  0% {\n    left: -5px;\n  }\n\n  50% {\n    left: 0px;\n  }\n\n  100% {\n    left: 5px;\n  }\n}\n"],"sourceRoot":""}]);
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

#boards_container > *.wait > *:not(.game_play) {
  opacity: 0.4;
  pointer-events: none;
}

#boards_container > * > .board > * > .cell {
  border: none;
}

#boards_container.busy > * > .board > * > .cell:not(.hit):not(.miss) {
  cursor: pointer;
}

#boards_container.busy > * > .board > * > .cell:not(.hit):not(.miss):hover > .cell_content {
  border-width: 3px;
  border-color: green;
}

#boards_container > *:not(.wait) > * > * > .cell > .cell_content > .ship {
  background-color: transparent;
}

.player_one,
.player_two {
  position: relative;
  width: min-content;
}

.player_two.inactive {
  display: none;
}

.play_btn.inactive {
  display: none;
}

.play_btn {
  display: block;
  position: absolute;
  top: 10%;
  padding: var(--padding-med-btn);
}

.play_btn > button {
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
  height: 100%;
  background-color: cornflowerblue;
}

.cell > .cell_content > .blank_wrapper {
  display: block;
}

.cell.done > .cell_content {
  border-color: red;
  border-width: 2px;
}

#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before,
#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::after {
  /* Original values */
  /*
  left: 50%;
  width: 2px;
  top: -25%;
  height: 150%;
  */
  content: '';
  position: absolute;
  background: red;
  left: 45%;
  width: 3px;
  top: -10%;
  height: 120%;
  z-index: 2;
}

#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before {
  /* Original */
  transform: rotate(45deg);
  margin-top: 1px;
}

#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::after {
  /* Original */
  transform: rotate(-45deg);
  margin-top: 1px;
}

#boards_container > * > .board > * > .cell.miss > .cell_content > .blank_wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 4px;
  width: 4px;
  background: #333;
  border-radius: 50%;
  margin-top: -2px;
  margin-left: -2px;
  z-index: 1;
}

#boards_container > * > .board > * > .cell.done > .cell_content > .blank_wrapper {
  position: absolute;
  border: 4px solid red;
  top: -2px;
  left: -2px;
  z-index: 2;
  width: inherit;
  height: inherit;
}

#boards_container > * > .board > * > .cell.miss > .cell_content {
  background-color: #e1e3e8;
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
`, "",{"version":3,"sources":["webpack://./src/styles/screenController.css"],"names":[],"mappings":"AAAA;EACE,eAAe;EACf,aAAa;EACb,SAAS;EACT,iBAAiB;AACnB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,YAAY;EACZ,oBAAoB;AACtB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,iBAAiB;EACjB,mBAAmB;AACrB;;AAEA;EACE,6BAA6B;AAC/B;;AAEA;;EAEE,kBAAkB;EAClB,kBAAkB;AACpB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,cAAc;EACd,kBAAkB;EAClB,QAAQ;EACR,+BAA+B;AACjC;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,UAAU;EACV,WAAW;EACX,kBAAkB;EAClB,uBAAuB;EACvB,0BAA0B;EAC1B,uBAAuB;EACvB,6BAA6B;AAC/B;;AAEA;EACE;;;GAGC;EACD,oBAAoB;EACpB,YAAY;EACZ,gCAAgC;AAClC;;AAEA;EACE,cAAc;AAChB;;AAEA;EACE,iBAAiB;EACjB,iBAAiB;AACnB;;AAEA;;EAEE,oBAAoB;EACpB;;;;;GAKC;EACD,WAAW;EACX,kBAAkB;EAClB,eAAe;EACf,SAAS;EACT,UAAU;EACV,SAAS;EACT,YAAY;EACZ,UAAU;AACZ;;AAEA;EACE,aAAa;EACb,wBAAwB;EACxB,eAAe;AACjB;;AAEA;EACE,aAAa;EACb,yBAAyB;EACzB,eAAe;AACjB;;AAEA;EACE,kBAAkB;EAClB,QAAQ;EACR,SAAS;EACT,WAAW;EACX,UAAU;EACV,gBAAgB;EAChB,kBAAkB;EAClB,gBAAgB;EAChB,iBAAiB;EACjB,UAAU;AACZ;;AAEA;EACE,kBAAkB;EAClB,qBAAqB;EACrB,SAAS;EACT,UAAU;EACV,UAAU;EACV,cAAc;EACd,eAAe;AACjB;;AAEA;EACE,yBAAyB;AAC3B;;AAEA;EACE,kBAAkB;EAClB,YAAY;EACZ,aAAa;EACb,UAAU;EACV,MAAM;EACN,mBAAmB;EACnB,WAAW;AACb;;AAEA;EACE,kBAAkB;EAClB,SAAS;EACT,kBAAkB;EAClB,WAAW;EACX,WAAW;AACb","sourcesContent":["#boards_container {\n  margin-top: 4em;\n  display: flex;\n  gap: 8rem;\n  user-select: none;\n}\n\n#boards_container > * > .board > * {\n  display: flex;\n}\n\n#boards_container > *.wait > *:not(.game_play) {\n  opacity: 0.4;\n  pointer-events: none;\n}\n\n#boards_container > * > .board > * > .cell {\n  border: none;\n}\n\n#boards_container.busy > * > .board > * > .cell:not(.hit):not(.miss) {\n  cursor: pointer;\n}\n\n#boards_container.busy > * > .board > * > .cell:not(.hit):not(.miss):hover > .cell_content {\n  border-width: 3px;\n  border-color: green;\n}\n\n#boards_container > *:not(.wait) > * > * > .cell > .cell_content > .ship {\n  background-color: transparent;\n}\n\n.player_one,\n.player_two {\n  position: relative;\n  width: min-content;\n}\n\n.player_two.inactive {\n  display: none;\n}\n\n.play_btn.inactive {\n  display: none;\n}\n\n.play_btn {\n  display: block;\n  position: absolute;\n  top: 10%;\n  padding: var(--padding-med-btn);\n}\n\n.play_btn > button {\n  font-size: 4rem;\n}\n\n.cell > * {\n  width: 2em;\n  height: 2em;\n  position: relative;\n  background-color: white;\n  /* pointer-events: none; */\n  border: 1px solid black;\n  /* box-sizing: content-box; */\n}\n\n.cell > .cell_content > .ship {\n  /*\n  Show ship during placing ships phase\n  Show only active player's ship when game is in play\n  */\n  pointer-events: none;\n  height: 100%;\n  background-color: cornflowerblue;\n}\n\n.cell > .cell_content > .blank_wrapper {\n  display: block;\n}\n\n.cell.done > .cell_content {\n  border-color: red;\n  border-width: 2px;\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before,\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::after {\n  /* Original values */\n  /*\n  left: 50%;\n  width: 2px;\n  top: -25%;\n  height: 150%;\n  */\n  content: '';\n  position: absolute;\n  background: red;\n  left: 45%;\n  width: 3px;\n  top: -10%;\n  height: 120%;\n  z-index: 2;\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before {\n  /* Original */\n  transform: rotate(45deg);\n  margin-top: 1px;\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::after {\n  /* Original */\n  transform: rotate(-45deg);\n  margin-top: 1px;\n}\n\n#boards_container > * > .board > * > .cell.miss > .cell_content > .blank_wrapper {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  height: 4px;\n  width: 4px;\n  background: #333;\n  border-radius: 50%;\n  margin-top: -2px;\n  margin-left: -2px;\n  z-index: 1;\n}\n\n#boards_container > * > .board > * > .cell.done > .cell_content > .blank_wrapper {\n  position: absolute;\n  border: 4px solid red;\n  top: -2px;\n  left: -2px;\n  z-index: 2;\n  width: inherit;\n  height: inherit;\n}\n\n#boards_container > * > .board > * > .cell.miss > .cell_content {\n  background-color: #e1e3e8;\n}\n\n.cell_content > .row_marker {\n  position: absolute;\n  height: 100%;\n  display: flex;\n  left: -2em;\n  top: 0;\n  align-items: center;\n  z-index: -1;\n}\n\n.cell_content > .col_marker {\n  position: absolute;\n  top: -2em;\n  text-align: center;\n  width: 100%;\n  z-index: -1;\n}\n"],"sourceRoot":""}]);
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
/* harmony import */ var _helpers_createElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../helpers/createElement */ "./src/helpers/createElement.js");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((playerBoard) => {
  const board = {
    render(board) {
      const playerBoard = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
      playerBoard.classList.add('board');
      board.forEach((row, y) => {
        const boardRow = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
        boardRow.classList.add('board_row');
        row.forEach((cell, x) => {
          const cellBtn = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('button');
          cellBtn.setAttributes({
            class: 'cell',
            ['data-x']: x + 1,
            ['data-y']: row.length - y,
          });
          // Need to show only activePlayer's ships
          // Need to hide the opponent's ships when activePlayer changes
          const cellContent = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
          const blankWrapper = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('span');
          blankWrapper.classList.add('blank_wrapper');
          cellContent.appendChild(blankWrapper);
          if (cell.ship) {
            console.log(cell.ship.length);
            // Problem, allows opponents to cheat in a browser developer tools
            const cellShip = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
            cellShip.classList.add('ship');
            cellContent.appendChild(cellShip);
          }
          cellContent.classList.add('cell_content');
          cellBtn.appendChild(cellContent);
          // Need to check for left and top edges of board
          // To create row and column labels
          if (x === 0 || y === 0) {
            const rowMarker = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
            const colMarker = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])('div');
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

  return board.render(playerBoard);
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
      console.log(type);
      console.log(player);
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
      console.log(this.main);
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
                class: 'random_btn',
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





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((player, game, mode) => {
  const port = {
    // Rename to portController or shipsController?
    player,
    game,
    mode,
    init() {
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.dragEndHandler = this.dragEndHandler.bind(this);
      this.dragMoveHandler = this.dragMoveHandler.bind(this);
      this.dropHandler = this.dropHandler.bind(this);
      this.rotateHandler = this.rotateHandler.bind(this);
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.resetHandler = this.resetHandler.bind(this);
      this.readyHandler = this.readyHandler.bind(this);

      this.playerBoard =
        player === 'player_one' ? this.game.playerOneBoard : this.game.playerTwoBoard;
      this.dropSubscriber = `drop${player.substring(player.indexOf('_'))}`;
      this.rotateSubscriber = `rotate${player.substring(player.indexOf('_'))}`;
    },
    cacheDOM(element) {
      this.port = element;
      this.ports = element.querySelectorAll('.port_ship');
      this.ships = element.querySelectorAll('.ship_box');
      this.resetBtn = element.querySelector('.reset_btn');
      this.readyBtn = element.querySelector('.ready_btn');
    },
    bindEvents() {
      this.ships.forEach((ship) => {
        // https://stackoverflow.com/questions/40464690/want-to-perform-different-task-on-mousedown-and-click-event
        ship.addEventListener('mousedown', this.dragStartHandler);
      });

      // this.readyEvent = new Event('click');
      this.resetBtn.addEventListener('click', this.resetHandler);
      this.readyBtn.addEventListener('click', this.readyHandler);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe(this.dropSubscriber, this.dropHandler);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe(this.rotateSubscriber, this.rotateHandler);
    },
    render() {
      const playerPort = (0,_helpers_createElement__WEBPACK_IMPORTED_MODULE_0__["default"])(_port_config__WEBPACK_IMPORTED_MODULE_1__["default"].element);
      playerPort.setAttributes(_port_config__WEBPACK_IMPORTED_MODULE_1__["default"].attributes);
      playerPort.setChildren(_port_config__WEBPACK_IMPORTED_MODULE_1__["default"].children);
      this.cacheDOM(playerPort);
      if (!this.mode) this.readyBtn.classList.add('inactive');
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
        // this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, true, false, id);
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
        // this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, false, false, id);
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
        this.draggable.style.left = `-4%`;
        this.draggable.style.top = `-4%`;
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
          this.draggable.style.left = `-4%`;
          this.draggable.style.top = `-4%`;
          if (this.resetBtn.classList.contains('inactive')) {
            this.resetBtn.classList.remove('inactive');
          }

          if (this.isPortsEmpty() && !this.gameReady) {
            this.gameReady = true;
            this.readyBtn.click();
            if (this.mode) this.readyBtn.classList.remove('inactive');
            [...this.port.children].forEach((child) => {
              if (!child.classList.contains('btns_container')) {
                child.style.display = 'none';
              }
            });
          }
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
          // this.game.playerOneBoard.placeShip([x, y], shipLength, newOrientation, false, true, id);
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
        this.draggable.style.width = newOrientation ? newHeight : newWidth;
        this.draggable.style.height = newOrientation ? newWidth : newHeight;
      } else if (e === false) {
        this.draggable.classList.add('rotate_error');

        setTimeout(() => {
          this.draggable.classList.remove('rotate_error');
        }, 250);
      }
    },
    resetHandler(e) {
      // Clears board
      this.gameReady = false;
      const playerBoard = this.resetBtn.closest(
        this.resetBtn.closest('.player_one') ? '.player_one' : '.player_two',
      ).firstChild;

      this.playerBoard.clearBoard();
      this.port.replaceWith(this.render());
      playerBoard.replaceWith((0,_board_board__WEBPACK_IMPORTED_MODULE_3__["default"])(this.playerBoard.board));
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('playerReady', this.player);
    },
    isPortsEmpty() {
      return [...this.ports].every((port) => port.firstChild === null);
    },
    readyHandler(e) {
      const isReady = e.currentTarget.dataset.ready !== 'true';
      e.currentTarget.textContent = isReady ? 'Unready' : 'Ready';
      e.currentTarget.dataset.ready = isReady;
      if (this.mode) this.hideShips(isReady);
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('playerReady', this.player, isReady);
    },
    hideShips(isReady) {
      this.ships.forEach((ship) => {
        const display = isReady ? 'none' : 'block';
        ship.style.display = display;
      });
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
      if (player && isReady !== undefined) {
        if (isReady) {
          this.playersReady.push(player);
        } else {
          this.playersReady.splice(index, 1);
        }
      } else if (index > -1) {
        this.playersReady.splice(index, 1);
      }

      if (this.playersReady.length === 2 && this.playBtn.classList.contains('inactive')) {
        this.playBtn.classList.remove('inactive');
      } else {
        this.playBtn.classList.add('inactive');
      }
    } else {
      if (this.playerTwoContainer.classList.contains('inactive')) {
        this.playerTwoContainer.classList.remove('inactive');
      } else {
        this.playerTwoContainer.classList.add('inactive');
      }
    }
  },
  play(e) {
    if (!this.mode) {
      this.game.playerTwo.board.placeShipsRandom();
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
    console.log(coordinates);
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
    // const button = this.getButton(coordinates);
    // button.classList.add(cell.miss ? 'miss' : 'hit');
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
        playerOne: this.game.playerOneBoard.board,
        playerTwo: this.game.playerTwoBoard.board,
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
      playerOneContainer.appendChild((0,_board_board__WEBPACK_IMPORTED_MODULE_6__["default"])(this.boards.playerOne));
      playerTwoContainer.appendChild((0,_board_board__WEBPACK_IMPORTED_MODULE_6__["default"])(this.boards.playerTwo));
      playerOneContainer.appendChild(playerOneHeader);
      playerTwoContainer.appendChild(playerTwoHeader);
      boardsContainer.appendChild(playerOneContainer);
      boardsContainer.appendChild(playerTwoContainer);
      gamePlayBtn.appendChild(gamePlayBtnText);
      gamePlayContainer.appendChild(gamePlayBtn);
      if (!this.gameReady) {
        playerOneContainer.appendChild((0,_port_port__WEBPACK_IMPORTED_MODULE_5__["default"])('player_one', this.game, this.mode));
        if (this.mode) {
          playerTwoContainer.appendChild((0,_port_port__WEBPACK_IMPORTED_MODULE_5__["default"])('player_two', this.game, this.mode));
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

  const placeShipsRandom = () => {
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    const coordinates = [];
    let i = 0;

    while (i < ships.length) {
      const [x, y] = generateRandomCoordinate();
      const [parsedX, parsedY] = parseCoordinate([x, y]);
      const orientation = Math.floor(Math.random() * 2) === 1;
      const shipLength = ships[i];
      const shipCoordinates = generateShipCoordinates([parsedX, parsedY], orientation, shipLength);
      const isValidCoordinate = shipCoordinates.every(checkBoard);
      if (!coordinates.find(([a, b]) => a === x && b === y) && isValidCoordinate) {
        placeShip([x, y], shipLength, orientation, false, false, (0,_helpers_generateUUID__WEBPACK_IMPORTED_MODULE_2__["default"])());
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
      console.log(subscriber);
      this.subscribers[subscriber].push(fn);
    }
    console.log(this.subscribers);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsbUJBQW1CO0FBQzVFOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsa0JBQWtCO0FBQ2pDLGVBQWUsUUFBUTtBQUN2QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7QUFDaEI7QUFDQSxnQkFBZ0I7QUFDaEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxvQkFBb0I7QUFDcEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdCQUFnQjtBQUNoQjtBQUNBO0FBQ0E7QUFDQSxjQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWCxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsUUFBUTtBQUN2QjtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZSxrQkFBa0I7QUFDakMsZUFBZSxRQUFRO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBLE1BQU0sS0FBeUI7QUFDL0I7QUFDQTtBQUNBLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3hyQkQ7QUFDMEc7QUFDakI7QUFDTztBQUNoRyw0Q0FBNEMsK01BQW9GO0FBQ2hJLDhCQUE4QixtRkFBMkIsQ0FBQyw0RkFBcUM7QUFDL0YseUNBQXlDLHNGQUErQjtBQUN4RTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsbUNBQW1DO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esc0JBQXNCO0FBQ3RCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPLDhFQUE4RSxZQUFZLGFBQWEsYUFBYSxhQUFhLGFBQWEsT0FBTyxLQUFLLFlBQVksYUFBYSxhQUFhLGFBQWEsYUFBYSxhQUFhLGFBQWEsYUFBYSxhQUFhLGFBQWEsYUFBYSxhQUFhLE9BQU8sT0FBTyxVQUFVLFVBQVUsWUFBWSxXQUFXLE9BQU8sS0FBSyxZQUFZLGFBQWEsYUFBYSxhQUFhLGFBQWEsT0FBTyxLQUFLLFlBQVksV0FBVyxZQUFZLE9BQU8sS0FBSyxVQUFVLFlBQVksT0FBTyxLQUFLLFVBQVUsVUFBVSxZQUFZLHNDQUFzQyxnR0FBZ0csZ0ZBQWdGLHFCQUFxQix1QkFBdUIsR0FBRyxXQUFXLGtDQUFrQyxvQ0FBb0Msd0NBQXdDLDBDQUEwQyx3Q0FBd0MsNEJBQTRCLGdDQUFnQyw2QkFBNkIsZ0NBQWdDLDRCQUE0Qiw4QkFBOEIsZ0NBQWdDLEdBQUcsOEJBQThCLGVBQWUsY0FBYywyQkFBMkIsb0JBQW9CLEdBQUcsVUFBVSx1QkFBdUIsd0NBQXdDLDJDQUEyQyxvQ0FBb0MsdUJBQXVCLEdBQUcscUJBQXFCLHdCQUF3QixrQkFBa0Isd0NBQXdDLEdBQUcsbUJBQW1CLDJDQUEyQyxLQUFLLGtDQUFrQyxpQkFBaUIsa0JBQWtCLDRCQUE0QixHQUFHLHFCQUFxQjtBQUN6eUQ7QUFDQSxpRUFBZSx1QkFBdUIsRUFBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNsRXZDO0FBQzZHO0FBQ2pCO0FBQzVGLDhCQUE4QixtRkFBMkIsQ0FBQyw0RkFBcUM7QUFDL0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU8sd0ZBQXdGLFlBQVksYUFBYSxtQ0FBbUMseUJBQXlCLHlDQUF5QyxHQUFHLHFCQUFxQjtBQUNyUDtBQUNBLGlFQUFlLHVCQUF1QixFQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ1h2QztBQUM2RztBQUNqQjtBQUM1Riw4QkFBOEIsbUZBQTJCLENBQUMsNEZBQXFDO0FBQy9GO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxPQUFPLHNGQUFzRixNQUFNLEtBQUssVUFBVSxZQUFZLGFBQWEsV0FBVyxNQUFNLEtBQUssWUFBWSxhQUFhLFdBQVcsTUFBTSxLQUFLLFVBQVUsWUFBWSxPQUFPLEtBQUssWUFBWSxXQUFXLE1BQU0sS0FBSyxVQUFVLGlDQUFpQyxHQUFHLG9CQUFvQixrQkFBa0IsMkJBQTJCLDRCQUE0QixhQUFhLEdBQUcsd0JBQXdCLHNDQUFzQyw0Q0FBNEMsaUJBQWlCLEdBQUcsOEJBQThCLG9CQUFvQiw0Q0FBNEMsR0FBRywrQkFBK0Isc0JBQXNCLGlCQUFpQixHQUFHLCtCQUErQixtQkFBbUIsR0FBRyxxQkFBcUI7QUFDanlCO0FBQ0EsaUVBQWUsdUJBQXVCLEVBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDcEN2QztBQUM2RztBQUNqQjtBQUM1Riw4QkFBOEIsbUZBQTJCLENBQUMsNEZBQXFDO0FBQy9GO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU8sd0ZBQXdGLFVBQVUsWUFBWSxhQUFhLFdBQVcsTUFBTSxLQUFLLFVBQVUsWUFBWSxhQUFhLGFBQWEsT0FBTyxLQUFLLFlBQVksT0FBTyxLQUFLLFlBQVksYUFBYSxXQUFXLFVBQVUsVUFBVSxNQUFNLEtBQUssWUFBWSxhQUFhLGFBQWEsYUFBYSxPQUFPLEtBQUssVUFBVSxNQUFNLEtBQUssVUFBVSxVQUFVLFVBQVUsTUFBTSxLQUFLLFlBQVksYUFBYSxPQUFPLEtBQUssVUFBVSxZQUFZLGFBQWEsT0FBTyxLQUFLLFVBQVUsT0FBTyxLQUFLLFVBQVUsTUFBTSxLQUFLLEtBQUssWUFBWSxPQUFPLEtBQUssWUFBWSxNQUFNLGtDQUFrQyxrQkFBa0IsbUNBQW1DLHVCQUF1QixlQUFlLEdBQUcsaUJBQWlCLGtCQUFrQixxQkFBcUIsd0JBQXdCLCtCQUErQixHQUFHLGdCQUFnQix1QkFBdUIsR0FBRyw4QkFBOEIsOENBQThDLGFBQWEsZUFBZSxrQkFBa0IsR0FBRyxlQUFlLHFDQUFxQyx1QkFBdUIsc0JBQXNCLDBCQUEwQixHQUFHLGtDQUFrQyxpQkFBaUIsR0FBRyxxQkFBcUIsaUJBQWlCLGtCQUFrQixpQkFBaUIsR0FBRyxvQ0FBb0MsNEJBQTRCLHlDQUF5QyxHQUFHLHdCQUF3QixrQkFBa0Isd0JBQXdCLCtCQUErQixHQUFHLDZCQUE2QixvQkFBb0IsR0FBRywwQkFBMEIsa0JBQWtCLEdBQUcsdUJBQXVCLFFBQVEsOEJBQThCLEtBQUssWUFBWSxnQ0FBZ0MsS0FBSyxHQUFHLHFCQUFxQjtBQUNqckQ7QUFDQSxpRUFBZSx1QkFBdUIsRUFBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUM5RXZDO0FBQzZHO0FBQ2pCO0FBQzVGLDhCQUE4QixtRkFBMkIsQ0FBQyw0RkFBcUM7QUFDL0Y7QUFDQTtBQUNBO0FBQ0EsMkJBQTJCOztBQUUzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPLCtGQUErRixLQUFLLFFBQVEsV0FBVyxVQUFVLFVBQVUsWUFBWSxPQUFPLEtBQUssS0FBSyxPQUFPLFdBQVcsWUFBWSxhQUFhLFdBQVcsWUFBWSxhQUFhLFdBQVcsWUFBWSxPQUFPLEtBQUssVUFBVSxVQUFVLFlBQVksT0FBTyxLQUFLLFVBQVUsWUFBWSxhQUFhLFdBQVcsTUFBTSxLQUFLLFlBQVksYUFBYSxhQUFhLGFBQWEsYUFBYSxhQUFhLE9BQU8sS0FBSyxZQUFZLGFBQWEsb0RBQW9ELHFCQUFxQiw2QkFBNkIsb0JBQW9CLFlBQVksV0FBVyx1QkFBdUIsR0FBRyxzREFBc0Qsa0JBQWtCLG1CQUFtQixvQkFBb0IsNEJBQTRCLHNCQUFzQixlQUFlLHdCQUF3Qix3QkFBd0IsbUJBQW1CLHNCQUFzQixHQUFHLHVDQUF1QyxpQkFBaUIsaUJBQWlCLHlDQUF5QyxHQUFHLCtEQUErRCxrQkFBa0IscUNBQXFDLDJCQUEyQixjQUFjLEdBQUcseUNBQXlDLHFDQUFxQywwQkFBMEIsc0NBQXNDLGdDQUFnQyx1QkFBdUIsNENBQTRDLEdBQUcsK0NBQStDLCtDQUErQyx5Q0FBeUMsR0FBRyxxQkFBcUI7QUFDemxEO0FBQ0EsaUVBQWUsdUJBQXVCLEVBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDeER2QztBQUM2RztBQUNqQjtBQUM1Riw4QkFBOEIsbUZBQTJCLENBQUMsNEZBQXFDO0FBQy9GO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCO0FBQzlCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCO0FBQzlCOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU8sc0ZBQXNGLFVBQVUsTUFBTSxLQUFLLFlBQVksYUFBYSxXQUFXLFlBQVksT0FBTyxLQUFLLFVBQVUsWUFBWSxhQUFhLGFBQWEsV0FBVyxVQUFVLFlBQVksT0FBTyxLQUFLLFVBQVUsTUFBTSxLQUFLLFlBQVksV0FBVyxVQUFVLE1BQU0sS0FBSyxZQUFZLGFBQWEsT0FBTyxLQUFLLFlBQVksYUFBYSxhQUFhLE9BQU8sS0FBSyxZQUFZLGFBQWEsT0FBTyxLQUFLLFVBQVUsWUFBWSxXQUFXLE1BQU0sS0FBSyxZQUFZLE9BQU8sS0FBSyxZQUFZLE9BQU8sS0FBSyxVQUFVLE1BQU0sS0FBSyxVQUFVLE1BQU0sS0FBSyxVQUFVLE1BQU0sS0FBSyxLQUFLLFVBQVUsTUFBTSxLQUFLLFVBQVUsTUFBTSxLQUFLLFVBQVUsS0FBSyxzQ0FBc0Msa0JBQWtCLEdBQUcsZ0JBQWdCLHVCQUF1QiwrQkFBK0Isa0JBQWtCLGdDQUFnQyxLQUFLLGVBQWUsZUFBZSx1QkFBdUIsc0NBQXNDLDJCQUEyQixZQUFZLFdBQVcsZ0NBQWdDLEtBQUsscUJBQXFCLGlCQUFpQixHQUFHLCtCQUErQixnRUFBZ0UsYUFBYSxHQUFHLDZDQUE2Qyw0QkFBNEIsd0JBQXdCLEdBQUcsMkJBQTJCLHNCQUFzQiwwQkFBMEIsd0NBQXdDLEdBQUcsbUJBQW1CLHNCQUFzQiw0Q0FBNEMsR0FBRyxxQkFBcUIsa0JBQWtCLHFCQUFxQixpQkFBaUIsR0FBRyxnQ0FBZ0MseUJBQXlCLEdBQUcseUJBQXlCLHlCQUF5QixHQUFHLGdDQUFnQyxpQkFBaUIsR0FBRyxpQkFBaUIsa0JBQWtCLEdBQUcseUJBQXlCLGtCQUFrQixHQUFHLHNCQUFzQixRQUFRLGlCQUFpQixLQUFLLFdBQVcsZ0JBQWdCLEtBQUssWUFBWSxnQkFBZ0IsS0FBSyxHQUFHLHFCQUFxQjtBQUMzNkQ7QUFDQSxpRUFBZSx1QkFBdUIsRUFBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUM3RnZDO0FBQzZHO0FBQ2pCO0FBQzVGLDhCQUE4QixtRkFBMkIsQ0FBQyw0RkFBcUM7QUFDL0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkI7QUFDM0I7QUFDQSw4QkFBOEI7QUFDOUI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU8sa0dBQWtHLFVBQVUsVUFBVSxVQUFVLFlBQVksT0FBTyxLQUFLLFVBQVUsTUFBTSxLQUFLLFVBQVUsWUFBWSxPQUFPLEtBQUssVUFBVSxNQUFNLEtBQUssVUFBVSxPQUFPLEtBQUssWUFBWSxhQUFhLE9BQU8sS0FBSyxZQUFZLE9BQU8sTUFBTSxZQUFZLGFBQWEsT0FBTyxLQUFLLFVBQVUsTUFBTSxLQUFLLFVBQVUsTUFBTSxLQUFLLFVBQVUsWUFBWSxXQUFXLFlBQVksT0FBTyxLQUFLLFVBQVUsT0FBTyxLQUFLLFVBQVUsVUFBVSxZQUFZLGFBQWEsYUFBYSxhQUFhLGFBQWEsT0FBTyxLQUFLLE9BQU8sS0FBSyxZQUFZLFdBQVcsWUFBWSxPQUFPLEtBQUssVUFBVSxPQUFPLEtBQUssWUFBWSxhQUFhLE9BQU8sTUFBTSxZQUFZLFVBQVUsS0FBSyxVQUFVLFlBQVksV0FBVyxVQUFVLFVBQVUsVUFBVSxVQUFVLFVBQVUsTUFBTSxLQUFLLFVBQVUsWUFBWSxXQUFXLE9BQU8sS0FBSyxVQUFVLFlBQVksV0FBVyxPQUFPLEtBQUssWUFBWSxXQUFXLFVBQVUsVUFBVSxVQUFVLFlBQVksYUFBYSxhQUFhLGFBQWEsV0FBVyxNQUFNLEtBQUssWUFBWSxhQUFhLFdBQVcsVUFBVSxVQUFVLFVBQVUsVUFBVSxPQUFPLEtBQUssWUFBWSxPQUFPLEtBQUssWUFB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QUNWLGtDQUFrQyx5REFBWTtBQUM5QyxVQUFVO0FBQ1Y7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNILENBQUM7O0FBRWM7QUFDZjs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7O0FDbkRBLGlFQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNILENBQUMsRUFBQzs7QUFFRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9AaWNvbmZ1L3N2Zy1pbmplY3QvZGlzdC9zdmctaW5qZWN0LmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvYXBwLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9oZWFkZXIuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL2hvbWUuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL25hdmJhci5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbm90aWZpY2F0aW9ucy5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvcG9ydC5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvc2NyZWVuQ29udHJvbGxlci5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvYXBwLmNzcz9hNjcyIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL2hlYWRlci5jc3M/ZTY4YiIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9ob21lLmNzcz80YjUxIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL25hdmJhci5jc3M/YzFkYiIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9ub3RpZmljYXRpb25zLmNzcz8yZDJkIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3BvcnQuY3NzPzM0ZWYiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvc2NyZWVuQ29udHJvbGxlci5jc3M/MzQxZSIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvYXBwLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9ib2FyZC9ib2FyZC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL2hlYWRlci5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9oZWFkZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9uYXZiYXIvbmF2YmFyLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25hdmJhci9uYXZiYXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnMuY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9oZWFkZXIvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9ob21lL2hvbWUuY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9ob21lL2hvbWUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL21haW4vbWFpbi5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvcG9ydC9wb3J0LmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvcG9ydC9wb3J0LmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vY29tcG9zZUdhbWUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3NjcmVlbi9wbGF5R2FtZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvc2NyZWVuL3NjcmVlbkNvbnRyb2xsZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2dhbWVDb250cm9sbGVyLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9nYW1lYm9hcmQuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2lzQ29tcHV0ZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2lzSHVtYW4uanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3BpcGUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3BsYXllci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcHViU3ViLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9zaGlwLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvaGVscGVycy9jcmVhdGVFbGVtZW50LmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvaGVscGVycy9nZW5lcmF0ZVVVSUQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBTVkdJbmplY3QgLSBWZXJzaW9uIDEuMi4zXG4gKiBBIHRpbnksIGludHVpdGl2ZSwgcm9idXN0LCBjYWNoaW5nIHNvbHV0aW9uIGZvciBpbmplY3RpbmcgU1ZHIGZpbGVzIGlubGluZSBpbnRvIHRoZSBET00uXG4gKlxuICogaHR0cHM6Ly9naXRodWIuY29tL2ljb25mdS9zdmctaW5qZWN0XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE4IElOQ09SUywgdGhlIGNyZWF0b3JzIG9mIGljb25mdS5jb21cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIC0gaHR0cHM6Ly9naXRodWIuY29tL2ljb25mdS9zdmctaW5qZWN0L2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqL1xuXG4oZnVuY3Rpb24od2luZG93LCBkb2N1bWVudCkge1xuICAvLyBjb25zdGFudHMgZm9yIGJldHRlciBtaW5pZmljYXRpb25cbiAgdmFyIF9DUkVBVEVfRUxFTUVOVF8gPSAnY3JlYXRlRWxlbWVudCc7XG4gIHZhciBfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FXyA9ICdnZXRFbGVtZW50c0J5VGFnTmFtZSc7XG4gIHZhciBfTEVOR1RIXyA9ICdsZW5ndGgnO1xuICB2YXIgX1NUWUxFXyA9ICdzdHlsZSc7XG4gIHZhciBfVElUTEVfID0gJ3RpdGxlJztcbiAgdmFyIF9VTkRFRklORURfID0gJ3VuZGVmaW5lZCc7XG4gIHZhciBfU0VUX0FUVFJJQlVURV8gPSAnc2V0QXR0cmlidXRlJztcbiAgdmFyIF9HRVRfQVRUUklCVVRFXyA9ICdnZXRBdHRyaWJ1dGUnO1xuXG4gIHZhciBOVUxMID0gbnVsbDtcblxuICAvLyBjb25zdGFudHNcbiAgdmFyIF9fU1ZHSU5KRUNUID0gJ19fc3ZnSW5qZWN0JztcbiAgdmFyIElEX1NVRkZJWCA9ICctLWluamVjdC0nO1xuICB2YXIgSURfU1VGRklYX1JFR0VYID0gbmV3IFJlZ0V4cChJRF9TVUZGSVggKyAnXFxcXGQrJywgXCJnXCIpO1xuICB2YXIgTE9BRF9GQUlMID0gJ0xPQURfRkFJTCc7XG4gIHZhciBTVkdfTk9UX1NVUFBPUlRFRCA9ICdTVkdfTk9UX1NVUFBPUlRFRCc7XG4gIHZhciBTVkdfSU5WQUxJRCA9ICdTVkdfSU5WQUxJRCc7XG4gIHZhciBBVFRSSUJVVEVfRVhDTFVTSU9OX05BTUVTID0gWydzcmMnLCAnYWx0JywgJ29ubG9hZCcsICdvbmVycm9yJ107XG4gIHZhciBBX0VMRU1FTlQgPSBkb2N1bWVudFtfQ1JFQVRFX0VMRU1FTlRfXSgnYScpO1xuICB2YXIgSVNfU1ZHX1NVUFBPUlRFRCA9IHR5cGVvZiBTVkdSZWN0ICE9IF9VTkRFRklORURfO1xuICB2YXIgREVGQVVMVF9PUFRJT05TID0ge1xuICAgIHVzZUNhY2hlOiB0cnVlLFxuICAgIGNvcHlBdHRyaWJ1dGVzOiB0cnVlLFxuICAgIG1ha2VJZHNVbmlxdWU6IHRydWVcbiAgfTtcbiAgLy8gTWFwIG9mIElSSSByZWZlcmVuY2VhYmxlIHRhZyBuYW1lcyB0byBwcm9wZXJ0aWVzIHRoYXQgY2FuIHJlZmVyZW5jZSB0aGVtLiBUaGlzIGlzIGRlZmluZWQgaW5cbiAgLy8gaHR0cHM6Ly93d3cudzMub3JnL1RSL1NWRzExL2xpbmtpbmcuaHRtbCNwcm9jZXNzaW5nSVJJXG4gIHZhciBJUklfVEFHX1BST1BFUlRJRVNfTUFQID0ge1xuICAgIGNsaXBQYXRoOiBbJ2NsaXAtcGF0aCddLFxuICAgICdjb2xvci1wcm9maWxlJzogTlVMTCxcbiAgICBjdXJzb3I6IE5VTEwsXG4gICAgZmlsdGVyOiBOVUxMLFxuICAgIGxpbmVhckdyYWRpZW50OiBbJ2ZpbGwnLCAnc3Ryb2tlJ10sXG4gICAgbWFya2VyOiBbJ21hcmtlcicsICdtYXJrZXItZW5kJywgJ21hcmtlci1taWQnLCAnbWFya2VyLXN0YXJ0J10sXG4gICAgbWFzazogTlVMTCxcbiAgICBwYXR0ZXJuOiBbJ2ZpbGwnLCAnc3Ryb2tlJ10sXG4gICAgcmFkaWFsR3JhZGllbnQ6IFsnZmlsbCcsICdzdHJva2UnXVxuICB9O1xuICB2YXIgSU5KRUNURUQgPSAxO1xuICB2YXIgRkFJTCA9IDI7XG5cbiAgdmFyIHVuaXF1ZUlkQ291bnRlciA9IDE7XG4gIHZhciB4bWxTZXJpYWxpemVyO1xuICB2YXIgZG9tUGFyc2VyO1xuXG5cbiAgLy8gY3JlYXRlcyBhbiBTVkcgZG9jdW1lbnQgZnJvbSBhbiBTVkcgc3RyaW5nXG4gIGZ1bmN0aW9uIHN2Z1N0cmluZ1RvU3ZnRG9jKHN2Z1N0cikge1xuICAgIGRvbVBhcnNlciA9IGRvbVBhcnNlciB8fCBuZXcgRE9NUGFyc2VyKCk7XG4gICAgcmV0dXJuIGRvbVBhcnNlci5wYXJzZUZyb21TdHJpbmcoc3ZnU3RyLCAndGV4dC94bWwnKTtcbiAgfVxuXG5cbiAgLy8gc2VhcmlhbGl6ZXMgYW4gU1ZHIGVsZW1lbnQgdG8gYW4gU1ZHIHN0cmluZ1xuICBmdW5jdGlvbiBzdmdFbGVtVG9TdmdTdHJpbmcoc3ZnRWxlbWVudCkge1xuICAgIHhtbFNlcmlhbGl6ZXIgPSB4bWxTZXJpYWxpemVyIHx8IG5ldyBYTUxTZXJpYWxpemVyKCk7XG4gICAgcmV0dXJuIHhtbFNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcoc3ZnRWxlbWVudCk7XG4gIH1cblxuXG4gIC8vIFJldHVybnMgdGhlIGFic29sdXRlIHVybCBmb3IgdGhlIHNwZWNpZmllZCB1cmxcbiAgZnVuY3Rpb24gZ2V0QWJzb2x1dGVVcmwodXJsKSB7XG4gICAgQV9FTEVNRU5ULmhyZWYgPSB1cmw7XG4gICAgcmV0dXJuIEFfRUxFTUVOVC5ocmVmO1xuICB9XG5cblxuICAvLyBMb2FkIHN2ZyB3aXRoIGFuIFhIUiByZXF1ZXN0XG4gIGZ1bmN0aW9uIGxvYWRTdmcodXJsLCBjYWxsYmFjaywgZXJyb3JDYWxsYmFjaykge1xuICAgIGlmICh1cmwpIHtcbiAgICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAvLyByZWFkeVN0YXRlIGlzIERPTkVcbiAgICAgICAgICB2YXIgc3RhdHVzID0gcmVxLnN0YXR1cztcbiAgICAgICAgICBpZiAoc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgLy8gcmVxdWVzdCBzdGF0dXMgaXMgT0tcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlcS5yZXNwb25zZVhNTCwgcmVxLnJlc3BvbnNlVGV4dC50cmltKCkpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID49IDQwMCkge1xuICAgICAgICAgICAgLy8gcmVxdWVzdCBzdGF0dXMgaXMgZXJyb3IgKDR4eCBvciA1eHgpXG4gICAgICAgICAgICBlcnJvckNhbGxiYWNrKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT0gMCkge1xuICAgICAgICAgICAgLy8gcmVxdWVzdCBzdGF0dXMgMCBjYW4gaW5kaWNhdGUgYSBmYWlsZWQgY3Jvc3MtZG9tYWluIGNhbGxcbiAgICAgICAgICAgIGVycm9yQ2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICByZXEub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgIHJlcS5zZW5kKCk7XG4gICAgfVxuICB9XG5cblxuICAvLyBDb3B5IGF0dHJpYnV0ZXMgZnJvbSBpbWcgZWxlbWVudCB0byBzdmcgZWxlbWVudFxuICBmdW5jdGlvbiBjb3B5QXR0cmlidXRlcyhpbWdFbGVtLCBzdmdFbGVtKSB7XG4gICAgdmFyIGF0dHJpYnV0ZTtcbiAgICB2YXIgYXR0cmlidXRlTmFtZTtcbiAgICB2YXIgYXR0cmlidXRlVmFsdWU7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBpbWdFbGVtLmF0dHJpYnV0ZXM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhdHRyaWJ1dGVzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICBhdHRyaWJ1dGUgPSBhdHRyaWJ1dGVzW2ldO1xuICAgICAgYXR0cmlidXRlTmFtZSA9IGF0dHJpYnV0ZS5uYW1lO1xuICAgICAgLy8gT25seSBjb3B5IGF0dHJpYnV0ZXMgbm90IGV4cGxpY2l0bHkgZXhjbHVkZWQgZnJvbSBjb3B5aW5nXG4gICAgICBpZiAoQVRUUklCVVRFX0VYQ0xVU0lPTl9OQU1FUy5pbmRleE9mKGF0dHJpYnV0ZU5hbWUpID09IC0xKSB7XG4gICAgICAgIGF0dHJpYnV0ZVZhbHVlID0gYXR0cmlidXRlLnZhbHVlO1xuICAgICAgICAvLyBJZiBpbWcgYXR0cmlidXRlIGlzIFwidGl0bGVcIiwgaW5zZXJ0IGEgdGl0bGUgZWxlbWVudCBpbnRvIFNWRyBlbGVtZW50XG4gICAgICAgIGlmIChhdHRyaWJ1dGVOYW1lID09IF9USVRMRV8pIHtcbiAgICAgICAgICB2YXIgdGl0bGVFbGVtO1xuICAgICAgICAgIHZhciBmaXJzdEVsZW1lbnRDaGlsZCA9IHN2Z0VsZW0uZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgICAgaWYgKGZpcnN0RWxlbWVudENoaWxkICYmIGZpcnN0RWxlbWVudENoaWxkLmxvY2FsTmFtZS50b0xvd2VyQ2FzZSgpID09IF9USVRMRV8pIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSBTVkcgZWxlbWVudCdzIGZpcnN0IGNoaWxkIGlzIGEgdGl0bGUgZWxlbWVudCwga2VlcCBpdCBhcyB0aGUgdGl0bGUgZWxlbWVudFxuICAgICAgICAgICAgdGl0bGVFbGVtID0gZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSBTVkcgZWxlbWVudCdzIGZpcnN0IGNoaWxkIGVsZW1lbnQgaXMgbm90IGEgdGl0bGUgZWxlbWVudCwgY3JlYXRlIGEgbmV3IHRpdGxlXG4gICAgICAgICAgICAvLyBlbGUsZW10IGFuZCBzZXQgaXQgYXMgdGhlIGZpcnN0IGNoaWxkXG4gICAgICAgICAgICB0aXRsZUVsZW0gPSBkb2N1bWVudFtfQ1JFQVRFX0VMRU1FTlRfICsgJ05TJ10oJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgX1RJVExFXyk7XG4gICAgICAgICAgICBzdmdFbGVtLmluc2VydEJlZm9yZSh0aXRsZUVsZW0sIGZpcnN0RWxlbWVudENoaWxkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gU2V0IG5ldyB0aXRsZSBjb250ZW50XG4gICAgICAgICAgdGl0bGVFbGVtLnRleHRDb250ZW50ID0gYXR0cmlidXRlVmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gU2V0IGltZyBhdHRyaWJ1dGUgdG8gc3ZnIGVsZW1lbnRcbiAgICAgICAgICBzdmdFbGVtW19TRVRfQVRUUklCVVRFX10oYXR0cmlidXRlTmFtZSwgYXR0cmlidXRlVmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICAvLyBUaGlzIGZ1bmN0aW9uIGFwcGVuZHMgYSBzdWZmaXggdG8gSURzIG9mIHJlZmVyZW5jZWQgZWxlbWVudHMgaW4gdGhlIDxkZWZzPiBpbiBvcmRlciB0byAgdG8gYXZvaWQgSUQgY29sbGlzaW9uXG4gIC8vIGJldHdlZW4gbXVsdGlwbGUgaW5qZWN0ZWQgU1ZHcy4gVGhlIHN1ZmZpeCBoYXMgdGhlIGZvcm0gXCItLWluamVjdC1YXCIsIHdoZXJlIFggaXMgYSBydW5uaW5nIG51bWJlciB3aGljaCBpc1xuICAvLyBpbmNyZW1lbnRlZCB3aXRoIGVhY2ggaW5qZWN0aW9uLiBSZWZlcmVuY2VzIHRvIHRoZSBJRHMgYXJlIGFkanVzdGVkIGFjY29yZGluZ2x5LlxuICAvLyBXZSBhc3N1bWUgdGhhIGFsbCBJRHMgd2l0aGluIHRoZSBpbmplY3RlZCBTVkcgYXJlIHVuaXF1ZSwgdGhlcmVmb3JlIHRoZSBzYW1lIHN1ZmZpeCBjYW4gYmUgdXNlZCBmb3IgYWxsIElEcyBvZiBvbmVcbiAgLy8gaW5qZWN0ZWQgU1ZHLlxuICAvLyBJZiB0aGUgb25seVJlZmVyZW5jZWQgYXJndW1lbnQgaXMgc2V0IHRvIHRydWUsIG9ubHkgdGhvc2UgSURzIHdpbGwgYmUgbWFkZSB1bmlxdWUgdGhhdCBhcmUgcmVmZXJlbmNlZCBmcm9tIHdpdGhpbiB0aGUgU1ZHXG4gIGZ1bmN0aW9uIG1ha2VJZHNVbmlxdWUoc3ZnRWxlbSwgb25seVJlZmVyZW5jZWQpIHtcbiAgICB2YXIgaWRTdWZmaXggPSBJRF9TVUZGSVggKyB1bmlxdWVJZENvdW50ZXIrKztcbiAgICAvLyBSZWd1bGFyIGV4cHJlc3Npb24gZm9yIGZ1bmN0aW9uYWwgbm90YXRpb25zIG9mIGFuIElSSSByZWZlcmVuY2VzLiBUaGlzIHdpbGwgZmluZCBvY2N1cmVuY2VzIGluIHRoZSBmb3JtXG4gICAgLy8gdXJsKCNhbnlJZCkgb3IgdXJsKFwiI2FueUlkXCIpIChmb3IgSW50ZXJuZXQgRXhwbG9yZXIpIGFuZCBjYXB0dXJlIHRoZSByZWZlcmVuY2VkIElEXG4gICAgdmFyIGZ1bmNJcmlSZWdleCA9IC91cmxcXChcIj8jKFthLXpBLVpdW1xcdzouLV0qKVwiP1xcKS9nO1xuICAgIC8vIEdldCBhbGwgZWxlbWVudHMgd2l0aCBhbiBJRC4gVGhlIFNWRyBzcGVjIHJlY29tbWVuZHMgdG8gcHV0IHJlZmVyZW5jZWQgZWxlbWVudHMgaW5zaWRlIDxkZWZzPiBlbGVtZW50cywgYnV0XG4gICAgLy8gdGhpcyBpcyBub3QgYSByZXF1aXJlbWVudCwgdGhlcmVmb3JlIHdlIGhhdmUgdG8gc2VhcmNoIGZvciBJRHMgaW4gdGhlIHdob2xlIFNWRy5cbiAgICB2YXIgaWRFbGVtZW50cyA9IHN2Z0VsZW0ucXVlcnlTZWxlY3RvckFsbCgnW2lkXScpO1xuICAgIHZhciBpZEVsZW07XG4gICAgLy8gQW4gb2JqZWN0IGNvbnRhaW5pbmcgcmVmZXJlbmNlZCBJRHMgIGFzIGtleXMgaXMgdXNlZCBpZiBvbmx5IHJlZmVyZW5jZWQgSURzIHNob3VsZCBiZSB1bmlxdWlmaWVkLlxuICAgIC8vIElmIHRoaXMgb2JqZWN0IGRvZXMgbm90IGV4aXN0LCBhbGwgSURzIHdpbGwgYmUgdW5pcXVpZmllZC5cbiAgICB2YXIgcmVmZXJlbmNlZElkcyA9IG9ubHlSZWZlcmVuY2VkID8gW10gOiBOVUxMO1xuICAgIHZhciB0YWdOYW1lO1xuICAgIHZhciBpcmlUYWdOYW1lcyA9IHt9O1xuICAgIHZhciBpcmlQcm9wZXJ0aWVzID0gW107XG4gICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICB2YXIgaSwgajtcblxuICAgIGlmIChpZEVsZW1lbnRzW19MRU5HVEhfXSkge1xuICAgICAgLy8gTWFrZSBhbGwgSURzIHVuaXF1ZSBieSBhZGRpbmcgdGhlIElEIHN1ZmZpeCBhbmQgY29sbGVjdCBhbGwgZW5jb3VudGVyZWQgdGFnIG5hbWVzXG4gICAgICAvLyB0aGF0IGFyZSBJUkkgcmVmZXJlbmNlYWJsZSBmcm9tIHByb3Blcml0aWVzLlxuICAgICAgZm9yIChpID0gMDsgaSA8IGlkRWxlbWVudHNbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgICAgdGFnTmFtZSA9IGlkRWxlbWVudHNbaV0ubG9jYWxOYW1lOyAvLyBVc2Ugbm9uLW5hbWVzcGFjZWQgdGFnIG5hbWVcbiAgICAgICAgLy8gTWFrZSBJRCB1bmlxdWUgaWYgdGFnIG5hbWUgaXMgSVJJIHJlZmVyZW5jZWFibGVcbiAgICAgICAgaWYgKHRhZ05hbWUgaW4gSVJJX1RBR19QUk9QRVJUSUVTX01BUCkge1xuICAgICAgICAgIGlyaVRhZ05hbWVzW3RhZ05hbWVdID0gMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gR2V0IGFsbCBwcm9wZXJ0aWVzIHRoYXQgYXJlIG1hcHBlZCB0byB0aGUgZm91bmQgSVJJIHJlZmVyZW5jZWFibGUgdGFnc1xuICAgICAgZm9yICh0YWdOYW1lIGluIGlyaVRhZ05hbWVzKSB7XG4gICAgICAgIChJUklfVEFHX1BST1BFUlRJRVNfTUFQW3RhZ05hbWVdIHx8IFt0YWdOYW1lXSkuZm9yRWFjaChmdW5jdGlvbiAobWFwcGVkUHJvcGVydHkpIHtcbiAgICAgICAgICAvLyBBZGQgbWFwcGVkIHByb3BlcnRpZXMgdG8gYXJyYXkgb2YgaXJpIHJlZmVyZW5jaW5nIHByb3BlcnRpZXMuXG4gICAgICAgICAgLy8gVXNlIGxpbmVhciBzZWFyY2ggaGVyZSBiZWNhdXNlIHRoZSBudW1iZXIgb2YgcG9zc2libGUgZW50cmllcyBpcyB2ZXJ5IHNtYWxsIChtYXhpbXVtIDExKVxuICAgICAgICAgIGlmIChpcmlQcm9wZXJ0aWVzLmluZGV4T2YobWFwcGVkUHJvcGVydHkpIDwgMCkge1xuICAgICAgICAgICAgaXJpUHJvcGVydGllcy5wdXNoKG1hcHBlZFByb3BlcnR5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGlyaVByb3BlcnRpZXNbX0xFTkdUSF9dKSB7XG4gICAgICAgIC8vIEFkZCBcInN0eWxlXCIgdG8gcHJvcGVydGllcywgYmVjYXVzZSBpdCBtYXkgY29udGFpbiByZWZlcmVuY2VzIGluIHRoZSBmb3JtICdzdHlsZT1cImZpbGw6dXJsKCNteUZpbGwpXCInXG4gICAgICAgIGlyaVByb3BlcnRpZXMucHVzaChfU1RZTEVfKTtcbiAgICAgIH1cbiAgICAgIC8vIFJ1biB0aHJvdWdoIGFsbCBlbGVtZW50cyBvZiB0aGUgU1ZHIGFuZCByZXBsYWNlIElEcyBpbiByZWZlcmVuY2VzLlxuICAgICAgLy8gVG8gZ2V0IGFsbCBkZXNjZW5kaW5nIGVsZW1lbnRzLCBnZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpIHNlZW1zIHRvIHBlcmZvcm0gZmFzdGVyIHRoYW4gcXVlcnlTZWxlY3RvckFsbCgnKicpLlxuICAgICAgLy8gU2luY2Ugc3ZnRWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpIGRvZXMgbm90IHJldHVybiB0aGUgc3ZnIGVsZW1lbnQgaXRzZWxmLCB3ZSBoYXZlIHRvIGhhbmRsZSBpdCBzZXBhcmF0ZWx5LlxuICAgICAgdmFyIGRlc2NFbGVtZW50cyA9IHN2Z0VsZW1bX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV9dKCcqJyk7XG4gICAgICB2YXIgZWxlbWVudCA9IHN2Z0VsZW07XG4gICAgICB2YXIgcHJvcGVydHlOYW1lO1xuICAgICAgdmFyIHZhbHVlO1xuICAgICAgdmFyIG5ld1ZhbHVlO1xuICAgICAgZm9yIChpID0gLTE7IGVsZW1lbnQgIT0gTlVMTDspIHtcbiAgICAgICAgaWYgKGVsZW1lbnQubG9jYWxOYW1lID09IF9TVFlMRV8pIHtcbiAgICAgICAgICAvLyBJZiBlbGVtZW50IGlzIGEgc3R5bGUgZWxlbWVudCwgcmVwbGFjZSBJRHMgaW4gYWxsIG9jY3VyZW5jZXMgb2YgXCJ1cmwoI2FueUlkKVwiIGluIHRleHQgY29udGVudFxuICAgICAgICAgIHZhbHVlID0gZWxlbWVudC50ZXh0Q29udGVudDtcbiAgICAgICAgICBuZXdWYWx1ZSA9IHZhbHVlICYmIHZhbHVlLnJlcGxhY2UoZnVuY0lyaVJlZ2V4LCBmdW5jdGlvbihtYXRjaCwgaWQpIHtcbiAgICAgICAgICAgIGlmIChyZWZlcmVuY2VkSWRzKSB7XG4gICAgICAgICAgICAgIHJlZmVyZW5jZWRJZHNbaWRdID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAndXJsKCMnICsgaWQgKyBpZFN1ZmZpeCArICcpJztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICBlbGVtZW50LnRleHRDb250ZW50ID0gbmV3VmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgLy8gUnVuIHRocm91Z2ggYWxsIHByb3BlcnR5IG5hbWVzIGZvciB3aGljaCBJRHMgd2VyZSBmb3VuZFxuICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBpcmlQcm9wZXJ0aWVzW19MRU5HVEhfXTsgaisrKSB7XG4gICAgICAgICAgICBwcm9wZXJ0eU5hbWUgPSBpcmlQcm9wZXJ0aWVzW2pdO1xuICAgICAgICAgICAgdmFsdWUgPSBlbGVtZW50W19HRVRfQVRUUklCVVRFX10ocHJvcGVydHlOYW1lKTtcbiAgICAgICAgICAgIG5ld1ZhbHVlID0gdmFsdWUgJiYgdmFsdWUucmVwbGFjZShmdW5jSXJpUmVnZXgsIGZ1bmN0aW9uKG1hdGNoLCBpZCkge1xuICAgICAgICAgICAgICBpZiAocmVmZXJlbmNlZElkcykge1xuICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRJZHNbaWRdID0gMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAndXJsKCMnICsgaWQgKyBpZFN1ZmZpeCArICcpJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICBlbGVtZW50W19TRVRfQVRUUklCVVRFX10ocHJvcGVydHlOYW1lLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlcGxhY2UgSURzIGluIHhsaW5rOnJlZiBhbmQgaHJlZiBhdHRyaWJ1dGVzXG4gICAgICAgICAgWyd4bGluazpocmVmJywgJ2hyZWYnXS5mb3JFYWNoKGZ1bmN0aW9uKHJlZkF0dHJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaXJpID0gZWxlbWVudFtfR0VUX0FUVFJJQlVURV9dKHJlZkF0dHJOYW1lKTtcbiAgICAgICAgICAgIGlmICgvXlxccyojLy50ZXN0KGlyaSkpIHsgLy8gQ2hlY2sgaWYgaXJpIGlzIG5vbi1udWxsIGFuZCBpbnRlcm5hbCByZWZlcmVuY2VcbiAgICAgICAgICAgICAgaXJpID0gaXJpLnRyaW0oKTtcbiAgICAgICAgICAgICAgZWxlbWVudFtfU0VUX0FUVFJJQlVURV9dKHJlZkF0dHJOYW1lLCBpcmkgKyBpZFN1ZmZpeCk7XG4gICAgICAgICAgICAgIGlmIChyZWZlcmVuY2VkSWRzKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIElEIHRvIHJlZmVyZW5jZWQgSURzXG4gICAgICAgICAgICAgICAgcmVmZXJlbmNlZElkc1tpcmkuc3Vic3RyaW5nKDEpXSA9IDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50ID0gZGVzY0VsZW1lbnRzWysraV07XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgaWRFbGVtZW50c1tfTEVOR1RIX107IGkrKykge1xuICAgICAgICBpZEVsZW0gPSBpZEVsZW1lbnRzW2ldO1xuICAgICAgICAvLyBJZiBzZXQgb2YgcmVmZXJlbmNlZCBJRHMgZXhpc3RzLCBtYWtlIG9ubHkgcmVmZXJlbmNlZCBJRHMgdW5pcXVlLFxuICAgICAgICAvLyBvdGhlcndpc2UgbWFrZSBhbGwgSURzIHVuaXF1ZS5cbiAgICAgICAgaWYgKCFyZWZlcmVuY2VkSWRzIHx8IHJlZmVyZW5jZWRJZHNbaWRFbGVtLmlkXSkge1xuICAgICAgICAgIC8vIEFkZCBzdWZmaXggdG8gZWxlbWVudCdzIElEXG4gICAgICAgICAgaWRFbGVtLmlkICs9IGlkU3VmZml4O1xuICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHJldHVybiB0cnVlIGlmIFNWRyBlbGVtZW50IGhhcyBjaGFuZ2VkXG4gICAgcmV0dXJuIGNoYW5nZWQ7XG4gIH1cblxuXG4gIC8vIEZvciBjYWNoZWQgU1ZHcyB0aGUgSURzIGFyZSBtYWRlIHVuaXF1ZSBieSBzaW1wbHkgcmVwbGFjaW5nIHRoZSBhbHJlYWR5IGluc2VydGVkIHVuaXF1ZSBJRHMgd2l0aCBhXG4gIC8vIGhpZ2hlciBJRCBjb3VudGVyLiBUaGlzIGlzIG11Y2ggbW9yZSBwZXJmb3JtYW50IHRoYW4gYSBjYWxsIHRvIG1ha2VJZHNVbmlxdWUoKS5cbiAgZnVuY3Rpb24gbWFrZUlkc1VuaXF1ZUNhY2hlZChzdmdTdHJpbmcpIHtcbiAgICByZXR1cm4gc3ZnU3RyaW5nLnJlcGxhY2UoSURfU1VGRklYX1JFR0VYLCBJRF9TVUZGSVggKyB1bmlxdWVJZENvdW50ZXIrKyk7XG4gIH1cblxuXG4gIC8vIEluamVjdCBTVkcgYnkgcmVwbGFjaW5nIHRoZSBpbWcgZWxlbWVudCB3aXRoIHRoZSBTVkcgZWxlbWVudCBpbiB0aGUgRE9NXG4gIGZ1bmN0aW9uIGluamVjdChpbWdFbGVtLCBzdmdFbGVtLCBhYnNVcmwsIG9wdGlvbnMpIHtcbiAgICBpZiAoc3ZnRWxlbSkge1xuICAgICAgc3ZnRWxlbVtfU0VUX0FUVFJJQlVURV9dKCdkYXRhLWluamVjdC11cmwnLCBhYnNVcmwpO1xuICAgICAgdmFyIHBhcmVudE5vZGUgPSBpbWdFbGVtLnBhcmVudE5vZGU7XG4gICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBpZiAob3B0aW9ucy5jb3B5QXR0cmlidXRlcykge1xuICAgICAgICAgIGNvcHlBdHRyaWJ1dGVzKGltZ0VsZW0sIHN2Z0VsZW0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEludm9rZSBiZWZvcmVJbmplY3QgaG9vayBpZiBzZXRcbiAgICAgICAgdmFyIGJlZm9yZUluamVjdCA9IG9wdGlvbnMuYmVmb3JlSW5qZWN0O1xuICAgICAgICB2YXIgaW5qZWN0RWxlbSA9IChiZWZvcmVJbmplY3QgJiYgYmVmb3JlSW5qZWN0KGltZ0VsZW0sIHN2Z0VsZW0pKSB8fCBzdmdFbGVtO1xuICAgICAgICAvLyBSZXBsYWNlIGltZyBlbGVtZW50IHdpdGggbmV3IGVsZW1lbnQuIFRoaXMgaXMgdGhlIGFjdHVhbCBpbmplY3Rpb24uXG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGluamVjdEVsZW0sIGltZ0VsZW0pO1xuICAgICAgICAvLyBNYXJrIGltZyBlbGVtZW50IGFzIGluamVjdGVkXG4gICAgICAgIGltZ0VsZW1bX19TVkdJTkpFQ1RdID0gSU5KRUNURUQ7XG4gICAgICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWdFbGVtKTtcbiAgICAgICAgLy8gSW52b2tlIGFmdGVySW5qZWN0IGhvb2sgaWYgc2V0XG4gICAgICAgIHZhciBhZnRlckluamVjdCA9IG9wdGlvbnMuYWZ0ZXJJbmplY3Q7XG4gICAgICAgIGlmIChhZnRlckluamVjdCkge1xuICAgICAgICAgIGFmdGVySW5qZWN0KGltZ0VsZW0sIGluamVjdEVsZW0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cblxuICAvLyBNZXJnZXMgYW55IG51bWJlciBvZiBvcHRpb25zIG9iamVjdHMgaW50byBhIG5ldyBvYmplY3RcbiAgZnVuY3Rpb24gbWVyZ2VPcHRpb25zKCkge1xuICAgIHZhciBtZXJnZWRPcHRpb25zID0ge307XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFsbCBzcGVjaWZpZWQgb3B0aW9ucyBvYmplY3RzIGFuZCBhZGQgYWxsIHByb3BlcnRpZXMgdG8gdGhlIG5ldyBvcHRpb25zIG9iamVjdFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJnc1tfTEVOR1RIX107IGkrKykge1xuICAgICAgdmFyIGFyZ3VtZW50ID0gYXJnc1tpXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50KSB7XG4gICAgICAgICAgaWYgKGFyZ3VtZW50Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIG1lcmdlZE9wdGlvbnNba2V5XSA9IGFyZ3VtZW50W2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgcmV0dXJuIG1lcmdlZE9wdGlvbnM7XG4gIH1cblxuXG4gIC8vIEFkZHMgdGhlIHNwZWNpZmllZCBDU1MgdG8gdGhlIGRvY3VtZW50J3MgPGhlYWQ+IGVsZW1lbnRcbiAgZnVuY3Rpb24gYWRkU3R5bGVUb0hlYWQoY3NzKSB7XG4gICAgdmFyIGhlYWQgPSBkb2N1bWVudFtfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FX10oJ2hlYWQnKVswXTtcbiAgICBpZiAoaGVhZCkge1xuICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnRbX0NSRUFURV9FTEVNRU5UX10oX1NUWUxFXyk7XG4gICAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxuICB9XG5cblxuICAvLyBCdWlsZHMgYW4gU1ZHIGVsZW1lbnQgZnJvbSB0aGUgc3BlY2lmaWVkIFNWRyBzdHJpbmdcbiAgZnVuY3Rpb24gYnVpbGRTdmdFbGVtZW50KHN2Z1N0ciwgdmVyaWZ5KSB7XG4gICAgaWYgKHZlcmlmeSkge1xuICAgICAgdmFyIHN2Z0RvYztcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFBhcnNlIHRoZSBTVkcgc3RyaW5nIHdpdGggRE9NUGFyc2VyXG4gICAgICAgIHN2Z0RvYyA9IHN2Z1N0cmluZ1RvU3ZnRG9jKHN2Z1N0cik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIE5VTEw7XG4gICAgICB9XG4gICAgICBpZiAoc3ZnRG9jW19HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfXSgncGFyc2VyZXJyb3InKVtfTEVOR1RIX10pIHtcbiAgICAgICAgLy8gRE9NUGFyc2VyIGRvZXMgbm90IHRocm93IGFuIGV4Y2VwdGlvbiwgYnV0IGluc3RlYWQgcHV0cyBwYXJzZXJlcnJvciB0YWdzIGluIHRoZSBkb2N1bWVudFxuICAgICAgICByZXR1cm4gTlVMTDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdmdEb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuaW5uZXJIVE1MID0gc3ZnU3RyO1xuICAgICAgcmV0dXJuIGRpdi5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICB9XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWdFbGVtKSB7XG4gICAgLy8gUmVtb3ZlIHRoZSBvbmxvYWQgYXR0cmlidXRlLiBTaG91bGQgb25seSBiZSB1c2VkIHRvIHJlbW92ZSB0aGUgdW5zdHlsZWQgaW1hZ2UgZmxhc2ggcHJvdGVjdGlvbiBhbmRcbiAgICAvLyBtYWtlIHRoZSBlbGVtZW50IHZpc2libGUsIG5vdCBmb3IgcmVtb3ZpbmcgdGhlIGV2ZW50IGxpc3RlbmVyLlxuICAgIGltZ0VsZW0ucmVtb3ZlQXR0cmlidXRlKCdvbmxvYWQnKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZXJyb3JNZXNzYWdlKG1zZykge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1NWR0luamVjdDogJyArIG1zZyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGZhaWwoaW1nRWxlbSwgc3RhdHVzLCBvcHRpb25zKSB7XG4gICAgaW1nRWxlbVtfX1NWR0lOSkVDVF0gPSBGQUlMO1xuICAgIGlmIChvcHRpb25zLm9uRmFpbCkge1xuICAgICAgb3B0aW9ucy5vbkZhaWwoaW1nRWxlbSwgc3RhdHVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3JNZXNzYWdlKHN0YXR1cyk7XG4gICAgfVxuICB9XG5cblxuICBmdW5jdGlvbiBzdmdJbnZhbGlkKGltZ0VsZW0sIG9wdGlvbnMpIHtcbiAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSk7XG4gICAgZmFpbChpbWdFbGVtLCBTVkdfSU5WQUxJRCwgb3B0aW9ucyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHN2Z05vdFN1cHBvcnRlZChpbWdFbGVtLCBvcHRpb25zKSB7XG4gICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pO1xuICAgIGZhaWwoaW1nRWxlbSwgU1ZHX05PVF9TVVBQT1JURUQsIG9wdGlvbnMpO1xuICB9XG5cblxuICBmdW5jdGlvbiBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKSB7XG4gICAgZmFpbChpbWdFbGVtLCBMT0FEX0ZBSUwsIG9wdGlvbnMpO1xuICB9XG5cblxuICBmdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVycyhpbWdFbGVtKSB7XG4gICAgaW1nRWxlbS5vbmxvYWQgPSBOVUxMO1xuICAgIGltZ0VsZW0ub25lcnJvciA9IE5VTEw7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGltZ05vdFNldChtc2cpIHtcbiAgICBlcnJvck1lc3NhZ2UoJ25vIGltZyBlbGVtZW50Jyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNWR0luamVjdChnbG9iYWxOYW1lLCBvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRPcHRpb25zID0gbWVyZ2VPcHRpb25zKERFRkFVTFRfT1BUSU9OUywgb3B0aW9ucyk7XG4gICAgdmFyIHN2Z0xvYWRDYWNoZSA9IHt9O1xuXG4gICAgaWYgKElTX1NWR19TVVBQT1JURUQpIHtcbiAgICAgIC8vIElmIHRoZSBicm93c2VyIHN1cHBvcnRzIFNWRywgYWRkIGEgc21hbGwgc3R5bGVzaGVldCB0aGF0IGhpZGVzIHRoZSA8aW1nPiBlbGVtZW50cyB1bnRpbFxuICAgICAgLy8gaW5qZWN0aW9uIGlzIGZpbmlzaGVkLiBUaGlzIGF2b2lkcyBzaG93aW5nIHRoZSB1bnN0eWxlZCBTVkdzIGJlZm9yZSBzdHlsZSBpcyBhcHBsaWVkLlxuICAgICAgYWRkU3R5bGVUb0hlYWQoJ2ltZ1tvbmxvYWRePVwiJyArIGdsb2JhbE5hbWUgKyAnKFwiXXt2aXNpYmlsaXR5OmhpZGRlbjt9Jyk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTVkdJbmplY3RcbiAgICAgKlxuICAgICAqIEluamVjdHMgdGhlIFNWRyBzcGVjaWZpZWQgaW4gdGhlIGBzcmNgIGF0dHJpYnV0ZSBvZiB0aGUgc3BlY2lmaWVkIGBpbWdgIGVsZW1lbnQgb3IgYXJyYXkgb2YgYGltZ2BcbiAgICAgKiBlbGVtZW50cy4gUmV0dXJucyBhIFByb21pc2Ugb2JqZWN0IHdoaWNoIHJlc29sdmVzIGlmIGFsbCBwYXNzZWQgaW4gYGltZ2AgZWxlbWVudHMgaGF2ZSBlaXRoZXIgYmVlblxuICAgICAqIGluamVjdGVkIG9yIGZhaWxlZCB0byBpbmplY3QgKE9ubHkgaWYgYSBnbG9iYWwgUHJvbWlzZSBvYmplY3QgaXMgYXZhaWxhYmxlIGxpa2UgaW4gYWxsIG1vZGVybiBicm93c2Vyc1xuICAgICAqIG9yIHRocm91Z2ggYSBwb2x5ZmlsbCkuXG4gICAgICpcbiAgICAgKiBPcHRpb25zOlxuICAgICAqIHVzZUNhY2hlOiBJZiBzZXQgdG8gYHRydWVgIHRoZSBTVkcgd2lsbCBiZSBjYWNoZWQgdXNpbmcgdGhlIGFic29sdXRlIFVSTC4gRGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuXG4gICAgICogY29weUF0dHJpYnV0ZXM6IElmIHNldCB0byBgdHJ1ZWAgdGhlIGF0dHJpYnV0ZXMgd2lsbCBiZSBjb3BpZWQgZnJvbSBgaW1nYCB0byBgc3ZnYC4gRGZhdWx0IHZhbHVlXG4gICAgICogICAgIGlzIGB0cnVlYC5cbiAgICAgKiBtYWtlSWRzVW5pcXVlOiBJZiBzZXQgdG8gYHRydWVgIHRoZSBJRCBvZiBlbGVtZW50cyBpbiB0aGUgYDxkZWZzPmAgZWxlbWVudCB0aGF0IGNhbiBiZSByZWZlcmVuY2VzIGJ5XG4gICAgICogICAgIHByb3BlcnR5IHZhbHVlcyAoZm9yIGV4YW1wbGUgJ2NsaXBQYXRoJykgYXJlIG1hZGUgdW5pcXVlIGJ5IGFwcGVuZGluZyBcIi0taW5qZWN0LVhcIiwgd2hlcmUgWCBpcyBhXG4gICAgICogICAgIHJ1bm5pbmcgbnVtYmVyIHdoaWNoIGluY3JlYXNlcyB3aXRoIGVhY2ggaW5qZWN0aW9uLiBUaGlzIGlzIGRvbmUgdG8gYXZvaWQgZHVwbGljYXRlIElEcyBpbiB0aGUgRE9NLlxuICAgICAqIGJlZm9yZUxvYWQ6IEhvb2sgYmVmb3JlIFNWRyBpcyBsb2FkZWQuIFRoZSBgaW1nYCBlbGVtZW50IGlzIHBhc3NlZCBhcyBhIHBhcmFtZXRlci4gSWYgdGhlIGhvb2sgcmV0dXJuc1xuICAgICAqICAgICBhIHN0cmluZyBpdCBpcyB1c2VkIGFzIHRoZSBVUkwgaW5zdGVhZCBvZiB0aGUgYGltZ2AgZWxlbWVudCdzIGBzcmNgIGF0dHJpYnV0ZS5cbiAgICAgKiBhZnRlckxvYWQ6IEhvb2sgYWZ0ZXIgU1ZHIGlzIGxvYWRlZC4gVGhlIGxvYWRlZCBgc3ZnYCBlbGVtZW50IGFuZCBgc3ZnYCBzdHJpbmcgYXJlIHBhc3NlZCBhcyBhXG4gICAgICogICAgIHBhcmFtZXRlcnMuIElmIGNhY2hpbmcgaXMgYWN0aXZlIHRoaXMgaG9vayB3aWxsIG9ubHkgZ2V0IGNhbGxlZCBvbmNlIGZvciBpbmplY3RlZCBTVkdzIHdpdGggdGhlXG4gICAgICogICAgIHNhbWUgYWJzb2x1dGUgcGF0aC4gQ2hhbmdlcyB0byB0aGUgYHN2Z2AgZWxlbWVudCBpbiB0aGlzIGhvb2sgd2lsbCBiZSBhcHBsaWVkIHRvIGFsbCBpbmplY3RlZCBTVkdzXG4gICAgICogICAgIHdpdGggdGhlIHNhbWUgYWJzb2x1dGUgcGF0aC4gSXQncyBhbHNvIHBvc3NpYmxlIHRvIHJldHVybiBhbiBgc3ZnYCBzdHJpbmcgb3IgYHN2Z2AgZWxlbWVudCB3aGljaFxuICAgICAqICAgICB3aWxsIHRoZW4gYmUgdXNlZCBmb3IgdGhlIGluamVjdGlvbi5cbiAgICAgKiBiZWZvcmVJbmplY3Q6IEhvb2sgYmVmb3JlIFNWRyBpcyBpbmplY3RlZC4gVGhlIGBpbWdgIGFuZCBgc3ZnYCBlbGVtZW50cyBhcmUgcGFzc2VkIGFzIHBhcmFtZXRlcnMuIElmXG4gICAgICogICAgIGFueSBodG1sIGVsZW1lbnQgaXMgcmV0dXJuZWQgaXQgZ2V0cyBpbmplY3RlZCBpbnN0ZWFkIG9mIGFwcGx5aW5nIHRoZSBkZWZhdWx0IFNWRyBpbmplY3Rpb24uXG4gICAgICogYWZ0ZXJJbmplY3Q6IEhvb2sgYWZ0ZXIgU1ZHIGlzIGluamVjdGVkLiBUaGUgYGltZ2AgYW5kIGBzdmdgIGVsZW1lbnRzIGFyZSBwYXNzZWQgYXMgcGFyYW1ldGVycy5cbiAgICAgKiBvbkFsbEZpbmlzaDogSG9vayBhZnRlciBhbGwgYGltZ2AgZWxlbWVudHMgcGFzc2VkIHRvIGFuIFNWR0luamVjdCgpIGNhbGwgaGF2ZSBlaXRoZXIgYmVlbiBpbmplY3RlZCBvclxuICAgICAqICAgICBmYWlsZWQgdG8gaW5qZWN0LlxuICAgICAqIG9uRmFpbDogSG9vayBhZnRlciBpbmplY3Rpb24gZmFpbHMuIFRoZSBgaW1nYCBlbGVtZW50IGFuZCBhIGBzdGF0dXNgIHN0cmluZyBhcmUgcGFzc2VkIGFzIGFuIHBhcmFtZXRlci5cbiAgICAgKiAgICAgVGhlIGBzdGF0dXNgIGNhbiBiZSBlaXRoZXIgYCdTVkdfTk9UX1NVUFBPUlRFRCdgICh0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IFNWRyksXG4gICAgICogICAgIGAnU1ZHX0lOVkFMSUQnYCAodGhlIFNWRyBpcyBub3QgaW4gYSB2YWxpZCBmb3JtYXQpIG9yIGAnTE9BRF9GQUlMRUQnYCAobG9hZGluZyBvZiB0aGUgU1ZHIGZhaWxlZCkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxJbWFnZUVsZW1lbnR9IGltZyAtIGFuIGltZyBlbGVtZW50IG9yIGFuIGFycmF5IG9mIGltZyBlbGVtZW50c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gLSBvcHRpb25hbCBwYXJhbWV0ZXIgd2l0aCBbb3B0aW9uc10oI29wdGlvbnMpIGZvciB0aGlzIGluamVjdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTVkdJbmplY3QoaW1nLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gbWVyZ2VPcHRpb25zKGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKTtcblxuICAgICAgdmFyIHJ1biA9IGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgdmFyIGFsbEZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBvbkFsbEZpbmlzaCA9IG9wdGlvbnMub25BbGxGaW5pc2g7XG4gICAgICAgICAgaWYgKG9uQWxsRmluaXNoKSB7XG4gICAgICAgICAgICBvbkFsbEZpbmlzaCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlICYmIHJlc29sdmUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaW1nICYmIHR5cGVvZiBpbWdbX0xFTkdUSF9dICE9IF9VTkRFRklORURfKSB7XG4gICAgICAgICAgLy8gYW4gYXJyYXkgbGlrZSBzdHJ1Y3R1cmUgb2YgaW1nIGVsZW1lbnRzXG4gICAgICAgICAgdmFyIGluamVjdEluZGV4ID0gMDtcbiAgICAgICAgICB2YXIgaW5qZWN0Q291bnQgPSBpbWdbX0xFTkdUSF9dO1xuXG4gICAgICAgICAgaWYgKGluamVjdENvdW50ID09IDApIHtcbiAgICAgICAgICAgIGFsbEZpbmlzaCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGlmICgrK2luamVjdEluZGV4ID09IGluamVjdENvdW50KSB7XG4gICAgICAgICAgICAgICAgYWxsRmluaXNoKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5qZWN0Q291bnQ7IGkrKykge1xuICAgICAgICAgICAgICBTVkdJbmplY3RFbGVtZW50KGltZ1tpXSwgb3B0aW9ucywgZmluaXNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gb25seSBvbmUgaW1nIGVsZW1lbnRcbiAgICAgICAgICBTVkdJbmplY3RFbGVtZW50KGltZywgb3B0aW9ucywgYWxsRmluaXNoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgLy8gcmV0dXJuIGEgUHJvbWlzZSBvYmplY3QgaWYgZ2xvYmFsbHkgYXZhaWxhYmxlXG4gICAgICByZXR1cm4gdHlwZW9mIFByb21pc2UgPT0gX1VOREVGSU5FRF8gPyBydW4oKSA6IG5ldyBQcm9taXNlKHJ1bik7XG4gICAgfVxuXG5cbiAgICAvLyBJbmplY3RzIGEgc2luZ2xlIHN2ZyBlbGVtZW50LiBPcHRpb25zIG11c3QgYmUgYWxyZWFkeSBtZXJnZWQgd2l0aCB0aGUgZGVmYXVsdCBvcHRpb25zLlxuICAgIGZ1bmN0aW9uIFNWR0luamVjdEVsZW1lbnQoaW1nRWxlbSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgIGlmIChpbWdFbGVtKSB7XG4gICAgICAgIHZhciBzdmdJbmplY3RBdHRyaWJ1dGVWYWx1ZSA9IGltZ0VsZW1bX19TVkdJTkpFQ1RdO1xuICAgICAgICBpZiAoIXN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlKSB7XG4gICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoaW1nRWxlbSk7XG5cbiAgICAgICAgICBpZiAoIUlTX1NWR19TVVBQT1JURUQpIHtcbiAgICAgICAgICAgIHN2Z05vdFN1cHBvcnRlZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIEludm9rZSBiZWZvcmVMb2FkIGhvb2sgaWYgc2V0LiBJZiB0aGUgYmVmb3JlTG9hZCByZXR1cm5zIGEgdmFsdWUgdXNlIGl0IGFzIHRoZSBzcmMgZm9yIHRoZSBsb2FkXG4gICAgICAgICAgLy8gVVJMIHBhdGguIEVsc2UgdXNlIHRoZSBpbWdFbGVtJ3Mgc3JjIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAgICAgICB2YXIgYmVmb3JlTG9hZCA9IG9wdGlvbnMuYmVmb3JlTG9hZDtcbiAgICAgICAgICB2YXIgc3JjID0gKGJlZm9yZUxvYWQgJiYgYmVmb3JlTG9hZChpbWdFbGVtKSkgfHwgaW1nRWxlbVtfR0VUX0FUVFJJQlVURV9dKCdzcmMnKTtcblxuICAgICAgICAgIGlmICghc3JjKSB7XG4gICAgICAgICAgICAvLyBJZiBubyBpbWFnZSBzcmMgYXR0cmlidXRlIGlzIHNldCBkbyBubyBpbmplY3Rpb24uIFRoaXMgY2FuIG9ubHkgYmUgcmVhY2hlZCBieSB1c2luZyBqYXZhc2NyaXB0XG4gICAgICAgICAgICAvLyBiZWNhdXNlIGlmIG5vIHNyYyBhdHRyaWJ1dGUgaXMgc2V0IHRoZSBvbmxvYWQgYW5kIG9uZXJyb3IgZXZlbnRzIGRvIG5vdCBnZXQgY2FsbGVkXG4gICAgICAgICAgICBpZiAoc3JjID09PSAnJykge1xuICAgICAgICAgICAgICBsb2FkRmFpbChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gc2V0IGFycmF5IHNvIGxhdGVyIGNhbGxzIGNhbiByZWdpc3RlciBjYWxsYmFja3NcbiAgICAgICAgICB2YXIgb25GaW5pc2hDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICBpbWdFbGVtW19fU1ZHSU5KRUNUXSA9IG9uRmluaXNoQ2FsbGJhY2tzO1xuXG4gICAgICAgICAgdmFyIG9uRmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgb25GaW5pc2hDYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihvbkZpbmlzaENhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIG9uRmluaXNoQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICB2YXIgYWJzVXJsID0gZ2V0QWJzb2x1dGVVcmwoc3JjKTtcbiAgICAgICAgICB2YXIgdXNlQ2FjaGVPcHRpb24gPSBvcHRpb25zLnVzZUNhY2hlO1xuICAgICAgICAgIHZhciBtYWtlSWRzVW5pcXVlT3B0aW9uID0gb3B0aW9ucy5tYWtlSWRzVW5pcXVlO1xuICAgICAgICAgIFxuICAgICAgICAgIHZhciBzZXRTdmdMb2FkQ2FjaGVWYWx1ZSA9IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgaWYgKHVzZUNhY2hlT3B0aW9uKSB7XG4gICAgICAgICAgICAgIHN2Z0xvYWRDYWNoZVthYnNVcmxdLmZvckVhY2goZnVuY3Rpb24oc3ZnTG9hZCkge1xuICAgICAgICAgICAgICAgIHN2Z0xvYWQodmFsKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHN2Z0xvYWRDYWNoZVthYnNVcmxdID0gdmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAodXNlQ2FjaGVPcHRpb24pIHtcbiAgICAgICAgICAgIHZhciBzdmdMb2FkID0gc3ZnTG9hZENhY2hlW2Fic1VybF07XG5cbiAgICAgICAgICAgIHZhciBoYW5kbGVMb2FkVmFsdWUgPSBmdW5jdGlvbihsb2FkVmFsdWUpIHtcbiAgICAgICAgICAgICAgaWYgKGxvYWRWYWx1ZSA9PT0gTE9BRF9GQUlMKSB7XG4gICAgICAgICAgICAgICAgbG9hZEZhaWwoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAobG9hZFZhbHVlID09PSBTVkdfSU5WQUxJRCkge1xuICAgICAgICAgICAgICAgIHN2Z0ludmFsaWQoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc1VuaXF1ZUlkcyA9IGxvYWRWYWx1ZVswXTtcbiAgICAgICAgICAgICAgICB2YXIgc3ZnU3RyaW5nID0gbG9hZFZhbHVlWzFdO1xuICAgICAgICAgICAgICAgIHZhciB1bmlxdWVJZHNTdmdTdHJpbmcgPSBsb2FkVmFsdWVbMl07XG4gICAgICAgICAgICAgICAgdmFyIHN2Z0VsZW07XG5cbiAgICAgICAgICAgICAgICBpZiAobWFrZUlkc1VuaXF1ZU9wdGlvbikge1xuICAgICAgICAgICAgICAgICAgaWYgKGhhc1VuaXF1ZUlkcyA9PT0gTlVMTCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJRHMgZm9yIHRoZSBTVkcgc3RyaW5nIGhhdmUgbm90IGJlZW4gbWFkZSB1bmlxdWUgYmVmb3JlLiBUaGlzIG1heSBoYXBwZW4gaWYgcHJldmlvdXNcbiAgICAgICAgICAgICAgICAgICAgLy8gaW5qZWN0aW9uIG9mIGEgY2FjaGVkIFNWRyBoYXZlIGJlZW4gcnVuIHdpdGggdGhlIG9wdGlvbiBtYWtlZElkc1VuaXF1ZSBzZXQgdG8gZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgc3ZnRWxlbSA9IGJ1aWxkU3ZnRWxlbWVudChzdmdTdHJpbmcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgaGFzVW5pcXVlSWRzID0gbWFrZUlkc1VuaXF1ZShzdmdFbGVtLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbG9hZFZhbHVlWzBdID0gaGFzVW5pcXVlSWRzO1xuICAgICAgICAgICAgICAgICAgICBsb2FkVmFsdWVbMl0gPSBoYXNVbmlxdWVJZHMgJiYgc3ZnRWxlbVRvU3ZnU3RyaW5nKHN2Z0VsZW0pO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNVbmlxdWVJZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSBJRHMgdW5pcXVlIGZvciBhbHJlYWR5IGNhY2hlZCBTVkdzIHdpdGggYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgICAgICAgICAgICAgIHN2Z1N0cmluZyA9IG1ha2VJZHNVbmlxdWVDYWNoZWQodW5pcXVlSWRzU3ZnU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzdmdFbGVtID0gc3ZnRWxlbSB8fCBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyaW5nLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICBpbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSwgYWJzVXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvbkZpbmlzaCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdmdMb2FkICE9IF9VTkRFRklORURfKSB7XG4gICAgICAgICAgICAgIC8vIFZhbHVlIGZvciB1cmwgZXhpc3RzIGluIGNhY2hlXG4gICAgICAgICAgICAgIGlmIChzdmdMb2FkLmlzQ2FsbGJhY2tRdWV1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFNhbWUgdXJsIGhhcyBiZWVuIGNhY2hlZCwgYnV0IHZhbHVlIGhhcyBub3QgYmVlbiBsb2FkZWQgeWV0LCBzbyBhZGQgdG8gY2FsbGJhY2tzXG4gICAgICAgICAgICAgICAgc3ZnTG9hZC5wdXNoKGhhbmRsZUxvYWRWYWx1ZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlTG9hZFZhbHVlKHN2Z0xvYWQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciBzdmdMb2FkID0gW107XG4gICAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eSBpc0NhbGxiYWNrUXVldWUgdG8gQXJyYXkgdG8gZGlmZmVyZW50aWF0ZSBmcm9tIGFycmF5IHdpdGggY2FjaGVkIGxvYWRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgc3ZnTG9hZC5pc0NhbGxiYWNrUXVldWUgPSB0cnVlO1xuICAgICAgICAgICAgICBzdmdMb2FkQ2FjaGVbYWJzVXJsXSA9IHN2Z0xvYWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gTG9hZCB0aGUgU1ZHIGJlY2F1c2UgaXQgaXMgbm90IGNhY2hlZCBvciBjYWNoaW5nIGlzIGRpc2FibGVkXG4gICAgICAgICAgbG9hZFN2ZyhhYnNVcmwsIGZ1bmN0aW9uKHN2Z1htbCwgc3ZnU3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIFhNTCBmcm9tIHRoZSBYSFIgcmVxdWVzdCBpZiBpdCBpcyBhbiBpbnN0YW5jZSBvZiBEb2N1bWVudC4gT3RoZXJ3aXNlXG4gICAgICAgICAgICAvLyAoZm9yIGV4YW1wbGUgb2YgSUU5KSwgY3JlYXRlIHRoZSBzdmcgZG9jdW1lbnQgZnJvbSB0aGUgc3ZnIHN0cmluZy5cbiAgICAgICAgICAgIHZhciBzdmdFbGVtID0gc3ZnWG1sIGluc3RhbmNlb2YgRG9jdW1lbnQgPyBzdmdYbWwuZG9jdW1lbnRFbGVtZW50IDogYnVpbGRTdmdFbGVtZW50KHN2Z1N0cmluZywgdHJ1ZSk7XG5cbiAgICAgICAgICAgIHZhciBhZnRlckxvYWQgPSBvcHRpb25zLmFmdGVyTG9hZDtcbiAgICAgICAgICAgIGlmIChhZnRlckxvYWQpIHtcbiAgICAgICAgICAgICAgLy8gSW52b2tlIGFmdGVyTG9hZCBob29rIHdoaWNoIG1heSBtb2RpZnkgdGhlIFNWRyBlbGVtZW50LiBBZnRlciBsb2FkIG1heSBhbHNvIHJldHVybiBhIG5ld1xuICAgICAgICAgICAgICAvLyBzdmcgZWxlbWVudCBvciBzdmcgc3RyaW5nXG4gICAgICAgICAgICAgIHZhciBzdmdFbGVtT3JTdmdTdHJpbmcgPSBhZnRlckxvYWQoc3ZnRWxlbSwgc3ZnU3RyaW5nKSB8fCBzdmdFbGVtO1xuICAgICAgICAgICAgICBpZiAoc3ZnRWxlbU9yU3ZnU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHN2Z0VsZW0gYW5kIHN2Z1N0cmluZyBiZWNhdXNlIG9mIG1vZGlmaWNhdGlvbnMgdG8gdGhlIFNWRyBlbGVtZW50IG9yIFNWRyBzdHJpbmcgaW5cbiAgICAgICAgICAgICAgICAvLyB0aGUgYWZ0ZXJMb2FkIGhvb2ssIHNvIHRoZSBtb2RpZmllZCBTVkcgaXMgYWxzbyB1c2VkIGZvciBhbGwgbGF0ZXIgY2FjaGVkIGluamVjdGlvbnNcbiAgICAgICAgICAgICAgICB2YXIgaXNTdHJpbmcgPSB0eXBlb2Ygc3ZnRWxlbU9yU3ZnU3RyaW5nID09ICdzdHJpbmcnO1xuICAgICAgICAgICAgICAgIHN2Z1N0cmluZyA9IGlzU3RyaW5nID8gc3ZnRWxlbU9yU3ZnU3RyaW5nIDogc3ZnRWxlbVRvU3ZnU3RyaW5nKHN2Z0VsZW0pO1xuICAgICAgICAgICAgICAgIHN2Z0VsZW0gPSBpc1N0cmluZyA/IGJ1aWxkU3ZnRWxlbWVudChzdmdFbGVtT3JTdmdTdHJpbmcsIHRydWUpIDogc3ZnRWxlbU9yU3ZnU3RyaW5nO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdmdFbGVtIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkge1xuICAgICAgICAgICAgICB2YXIgaGFzVW5pcXVlSWRzID0gTlVMTDtcbiAgICAgICAgICAgICAgaWYgKG1ha2VJZHNVbmlxdWVPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBoYXNVbmlxdWVJZHMgPSBtYWtlSWRzVW5pcXVlKHN2Z0VsZW0sIGZhbHNlKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmICh1c2VDYWNoZU9wdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciB1bmlxdWVJZHNTdmdTdHJpbmcgPSBoYXNVbmlxdWVJZHMgJiYgc3ZnRWxlbVRvU3ZnU3RyaW5nKHN2Z0VsZW0pO1xuICAgICAgICAgICAgICAgIC8vIHNldCBhbiBhcnJheSB3aXRoIHRocmVlIGVudHJpZXMgdG8gdGhlIGxvYWQgY2FjaGVcbiAgICAgICAgICAgICAgICBzZXRTdmdMb2FkQ2FjaGVWYWx1ZShbaGFzVW5pcXVlSWRzLCBzdmdTdHJpbmcsIHVuaXF1ZUlkc1N2Z1N0cmluZ10pO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaW5qZWN0KGltZ0VsZW0sIHN2Z0VsZW0sIGFic1VybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzdmdJbnZhbGlkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICBzZXRTdmdMb2FkQ2FjaGVWYWx1ZShTVkdfSU5WQUxJRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvbkZpbmlzaCgpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgbG9hZEZhaWwoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBzZXRTdmdMb2FkQ2FjaGVWYWx1ZShMT0FEX0ZBSUwpO1xuICAgICAgICAgICAgb25GaW5pc2goKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzdmdJbmplY3RBdHRyaWJ1dGVWYWx1ZSkpIHtcbiAgICAgICAgICAgIC8vIHN2Z0luamVjdEF0dHJpYnV0ZVZhbHVlIGlzIGFuIGFycmF5LiBJbmplY3Rpb24gaXMgbm90IGNvbXBsZXRlIHNvIHJlZ2lzdGVyIGNhbGxiYWNrXG4gICAgICAgICAgICBzdmdJbmplY3RBdHRyaWJ1dGVWYWx1ZS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGltZ05vdFNldCgpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgZGVmYXVsdCBbb3B0aW9uc10oI29wdGlvbnMpIGZvciBTVkdJbmplY3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gZGVmYXVsdCBbb3B0aW9uc10oI29wdGlvbnMpIGZvciBhbiBpbmplY3Rpb24uXG4gICAgICovXG4gICAgU1ZHSW5qZWN0LnNldE9wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBkZWZhdWx0T3B0aW9ucyA9IG1lcmdlT3B0aW9ucyhkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyk7XG4gICAgfTtcblxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIFNWR0luamVjdFxuICAgIFNWR0luamVjdC5jcmVhdGUgPSBjcmVhdGVTVkdJbmplY3Q7XG5cblxuICAgIC8qKlxuICAgICAqIFVzZWQgaW4gb25lcnJvciBFdmVudCBvZiBhbiBgPGltZz5gIGVsZW1lbnQgdG8gaGFuZGxlIGNhc2VzIHdoZW4gdGhlIGxvYWRpbmcgdGhlIG9yaWdpbmFsIHNyYyBmYWlsc1xuICAgICAqIChmb3IgZXhhbXBsZSBpZiBmaWxlIGlzIG5vdCBmb3VuZCBvciBpZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IFNWRykuIFRoaXMgdHJpZ2dlcnMgYSBjYWxsIHRvIHRoZVxuICAgICAqIG9wdGlvbnMgb25GYWlsIGhvb2sgaWYgYXZhaWxhYmxlLiBUaGUgb3B0aW9uYWwgc2Vjb25kIHBhcmFtZXRlciB3aWxsIGJlIHNldCBhcyB0aGUgbmV3IHNyYyBhdHRyaWJ1dGVcbiAgICAgKiBmb3IgdGhlIGltZyBlbGVtZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MSW1hZ2VFbGVtZW50fSBpbWcgLSBhbiBpbWcgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbZmFsbGJhY2tTcmNdIC0gb3B0aW9uYWwgcGFyYW1ldGVyIGZhbGxiYWNrIHNyY1xuICAgICAqL1xuICAgIFNWR0luamVjdC5lcnIgPSBmdW5jdGlvbihpbWcsIGZhbGxiYWNrU3JjKSB7XG4gICAgICBpZiAoaW1nKSB7XG4gICAgICAgIGlmIChpbWdbX19TVkdJTkpFQ1RdICE9IEZBSUwpIHtcbiAgICAgICAgICByZW1vdmVFdmVudExpc3RlbmVycyhpbWcpO1xuXG4gICAgICAgICAgaWYgKCFJU19TVkdfU1VQUE9SVEVEKSB7XG4gICAgICAgICAgICBzdmdOb3RTdXBwb3J0ZWQoaW1nLCBkZWZhdWx0T3B0aW9ucyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWcpO1xuICAgICAgICAgICAgbG9hZEZhaWwoaW1nLCBkZWZhdWx0T3B0aW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChmYWxsYmFja1NyYykge1xuICAgICAgICAgICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZyk7XG4gICAgICAgICAgICBpbWcuc3JjID0gZmFsbGJhY2tTcmM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbWdOb3RTZXQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2luZG93W2dsb2JhbE5hbWVdID0gU1ZHSW5qZWN0O1xuXG4gICAgcmV0dXJuIFNWR0luamVjdDtcbiAgfVxuXG4gIHZhciBTVkdJbmplY3RJbnN0YW5jZSA9IGNyZWF0ZVNWR0luamVjdCgnU1ZHSW5qZWN0Jyk7XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTVkdJbmplY3RJbnN0YW5jZTtcbiAgfVxufSkod2luZG93LCBkb2N1bWVudCk7IiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8wX19fID0gbmV3IFVSTChcIi4vYXNzZXRzL2ZvbnRzL1JvYm90b19Db25kZW5zZWQvc3RhdGljL1JvYm90b0NvbmRlbnNlZC1NZWRpdW0udHRmXCIsIGltcG9ydC5tZXRhLnVybCk7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fXyA9IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGBAZm9udC1mYWNlIHtcbiAgLyogaHR0cHM6Ly9mb250cy5nb29nbGUuY29tL3NwZWNpbWVuL1JvYm90bytDb25kZW5zZWQgKi9cbiAgZm9udC1mYW1pbHk6ICdSb2JvdG8gQ29uZGVuc2VkJztcbiAgc3JjOiB1cmwoJHtfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19ffSk7XG4gIGZvbnQtd2VpZ2h0OiA2MDA7XG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcbn1cblxuOnJvb3Qge1xuICAtLWNvbG9yLWZvbnQtcHJpbWFyeTogIzAwMDAwMDtcbiAgLS1jb2xvci1mb250LXNlY29uZGFyeTogI2U4ZTllYjtcbiAgLS1jb2xvci1iYWNrZ3JvdW5kLXByaW1hcnk6ICMzMTM2Mzg7XG4gIC0tY29sb3ItYmFja2dyb3VuZC1zZWNvbmRhcnk6ICNmMDY1NDM7XG4gIC0tY29sb3ItYmFja2dyb3VuZC1kZWZhdWx0OiAjZmZmZmZmO1xuICAtLWNvbG9yLWFjY2VudDogI2YwOWQ1MTtcbiAgLS1jb2xvci1ib3gtc2hhZG93OiAjMDAwMDAwO1xuICAtLWZsZXgtZ2FwLXNtYWxsOiAwLjVyZW07XG4gIC0tcGFkZGluZy1zbWFsbC1idG46IDAuNXJlbTtcbiAgLS1wYWRkaW5nLW1lZC1idG46IDFyZW07XG4gIC0tcGFkZGluZy1sYXJnZS1idG46IDJyZW07XG4gIC0tYm9yZGVyLXJhZGl1cy1idG46IDAuNXJlbTtcbn1cblxuKixcbio6OmJlZm9yZSxcbio6OmFmdGVyIHtcbiAgcGFkZGluZzogMDtcbiAgbWFyZ2luOiAwO1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICBmb250LXNpemU6IDE2cHg7XG59XG5cbmJvZHkge1xuICBtaW4taGVpZ2h0OiAxMDBzdmg7XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYigxNDksIDExNiwgNTkpO1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnLCBBcmlhbDtcbiAgZm9udC1mYW1pbHk6ICdSb2JvdG8gQ29uZGVuc2VkJztcbiAgZm9udC1mYW1pbHk6IEFyaWFsO1xufVxuXG4jYmF0dGxlc2hpcF9hcHAge1xuICBtaW4taGVpZ2h0OiBpbmhlcml0O1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLXJvd3M6IG1pbi1jb250ZW50IDFmcjtcbn1cblxuI21haW5fY29udGVudCB7XG4gIC8qIFRlbXBvcmFyeSAqL1xuICAvKiBtYXJnaW4tdG9wOiA0ZW07ICovXG59XG5cbiNtYWluX2NvbnRlbnQgPiA6Zmlyc3QtY2hpbGQge1xuICBoZWlnaHQ6IDEwMCU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvYXBwLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLHVEQUF1RDtFQUN2RCwrQkFBK0I7RUFDL0IsNENBQTJFO0VBQzNFLGdCQUFnQjtFQUNoQixrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSw2QkFBNkI7RUFDN0IsK0JBQStCO0VBQy9CLG1DQUFtQztFQUNuQyxxQ0FBcUM7RUFDckMsbUNBQW1DO0VBQ25DLHVCQUF1QjtFQUN2QiwyQkFBMkI7RUFDM0Isd0JBQXdCO0VBQ3hCLDJCQUEyQjtFQUMzQix1QkFBdUI7RUFDdkIseUJBQXlCO0VBQ3pCLDJCQUEyQjtBQUM3Qjs7QUFFQTs7O0VBR0UsVUFBVTtFQUNWLFNBQVM7RUFDVCxzQkFBc0I7RUFDdEIsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixtQ0FBbUM7RUFDbkMsc0NBQXNDO0VBQ3RDLCtCQUErQjtFQUMvQixrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxtQkFBbUI7RUFDbkIsYUFBYTtFQUNiLG1DQUFtQztBQUNyQzs7QUFFQTtFQUNFLGNBQWM7RUFDZCxxQkFBcUI7QUFDdkI7O0FBRUE7RUFDRSxZQUFZO0VBQ1osYUFBYTtFQUNiLHVCQUF1QjtBQUN6QlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCJAZm9udC1mYWNlIHtcXG4gIC8qIGh0dHBzOi8vZm9udHMuZ29vZ2xlLmNvbS9zcGVjaW1lbi9Sb2JvdG8rQ29uZGVuc2VkICovXFxuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xcbiAgc3JjOiB1cmwoLi9hc3NldHMvZm9udHMvUm9ib3RvX0NvbmRlbnNlZC9zdGF0aWMvUm9ib3RvQ29uZGVuc2VkLU1lZGl1bS50dGYpO1xcbiAgZm9udC13ZWlnaHQ6IDYwMDtcXG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcXG59XFxuXFxuOnJvb3Qge1xcbiAgLS1jb2xvci1mb250LXByaW1hcnk6ICMwMDAwMDA7XFxuICAtLWNvbG9yLWZvbnQtc2Vjb25kYXJ5OiAjZThlOWViO1xcbiAgLS1jb2xvci1iYWNrZ3JvdW5kLXByaW1hcnk6ICMzMTM2Mzg7XFxuICAtLWNvbG9yLWJhY2tncm91bmQtc2Vjb25kYXJ5OiAjZjA2NTQzO1xcbiAgLS1jb2xvci1iYWNrZ3JvdW5kLWRlZmF1bHQ6ICNmZmZmZmY7XFxuICAtLWNvbG9yLWFjY2VudDogI2YwOWQ1MTtcXG4gIC0tY29sb3ItYm94LXNoYWRvdzogIzAwMDAwMDtcXG4gIC0tZmxleC1nYXAtc21hbGw6IDAuNXJlbTtcXG4gIC0tcGFkZGluZy1zbWFsbC1idG46IDAuNXJlbTtcXG4gIC0tcGFkZGluZy1tZWQtYnRuOiAxcmVtO1xcbiAgLS1wYWRkaW5nLWxhcmdlLWJ0bjogMnJlbTtcXG4gIC0tYm9yZGVyLXJhZGl1cy1idG46IDAuNXJlbTtcXG59XFxuXFxuKixcXG4qOjpiZWZvcmUsXFxuKjo6YWZ0ZXIge1xcbiAgcGFkZGluZzogMDtcXG4gIG1hcmdpbjogMDtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBmb250LXNpemU6IDE2cHg7XFxufVxcblxcbmJvZHkge1xcbiAgbWluLWhlaWdodDogMTAwc3ZoO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE0OSwgMTE2LCA1OSk7XFxuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnLCBBcmlhbDtcXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XFxuICBmb250LWZhbWlseTogQXJpYWw7XFxufVxcblxcbiNiYXR0bGVzaGlwX2FwcCB7XFxuICBtaW4taGVpZ2h0OiBpbmhlcml0O1xcbiAgZGlzcGxheTogZ3JpZDtcXG4gIGdyaWQtdGVtcGxhdGUtcm93czogbWluLWNvbnRlbnQgMWZyO1xcbn1cXG5cXG4jbWFpbl9jb250ZW50IHtcXG4gIC8qIFRlbXBvcmFyeSAqL1xcbiAgLyogbWFyZ2luLXRvcDogNGVtOyAqL1xcbn1cXG5cXG4jbWFpbl9jb250ZW50ID4gOmZpcnN0LWNoaWxkIHtcXG4gIGhlaWdodDogMTAwJTtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjaGVhZGVyIHtcbiAgcGFkZGluZzogMWVtIDFlbSAzZW07XG4gIGJhY2tncm91bmQtY29sb3I6IHJnYigxNjUsIDE2NSwgMTY1KTtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9oZWFkZXIuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0Usb0JBQW9CO0VBQ3BCLG9DQUFvQztBQUN0Q1wiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjaGVhZGVyIHtcXG4gIHBhZGRpbmc6IDFlbSAxZW0gM2VtO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE2NSwgMTY1LCAxNjUpO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNob21lIHtcbn1cblxuLmdhbWVtb2RlX2J0bnMge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgZ2FwOiAyZW07XG59XG5cbi5nYW1lbW9kZV9idG5zID4gKiB7XG4gIHBhZGRpbmc6IHZhcigtLXBhZGRpbmctbGFyZ2UtYnRuKTtcbiAgYm9yZGVyLXJhZGl1czogdmFyKC0tYm9yZGVyLXJhZGl1cy1idG4pO1xuICBib3JkZXI6IG5vbmU7XG59XG5cbi5nYW1lbW9kZV9idG5zID4gKjpob3ZlciB7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgYm94LXNoYWRvdzogMHJlbSAwcmVtIDAuNXJlbSAwcmVtIGJsYWNrO1xufVxuXG4uZ2FtZW1vZGVfYnRucyA+ICo6YWN0aXZlIHtcbiAgYmFja2dyb3VuZDogYmxhY2s7XG4gIGNvbG9yOiB3aGl0ZTtcbn1cblxuLmdhbWVtb2RlX2J0bnMgPiAqID4gc3BhbiB7XG4gIGZvbnQtc2l6ZTogMmVtO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL2hvbWUuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0FBQ0E7O0FBRUE7RUFDRSxhQUFhO0VBQ2Isc0JBQXNCO0VBQ3RCLHVCQUF1QjtFQUN2QixRQUFRO0FBQ1Y7O0FBRUE7RUFDRSxpQ0FBaUM7RUFDakMsdUNBQXVDO0VBQ3ZDLFlBQVk7QUFDZDs7QUFFQTtFQUNFLGVBQWU7RUFDZix1Q0FBdUM7QUFDekM7O0FBRUE7RUFDRSxpQkFBaUI7RUFDakIsWUFBWTtBQUNkOztBQUVBO0VBQ0UsY0FBYztBQUNoQlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjaG9tZSB7XFxufVxcblxcbi5nYW1lbW9kZV9idG5zIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XFxuICBnYXA6IDJlbTtcXG59XFxuXFxuLmdhbWVtb2RlX2J0bnMgPiAqIHtcXG4gIHBhZGRpbmc6IHZhcigtLXBhZGRpbmctbGFyZ2UtYnRuKTtcXG4gIGJvcmRlci1yYWRpdXM6IHZhcigtLWJvcmRlci1yYWRpdXMtYnRuKTtcXG4gIGJvcmRlcjogbm9uZTtcXG59XFxuXFxuLmdhbWVtb2RlX2J0bnMgPiAqOmhvdmVyIHtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIGJveC1zaGFkb3c6IDByZW0gMHJlbSAwLjVyZW0gMHJlbSBibGFjaztcXG59XFxuXFxuLmdhbWVtb2RlX2J0bnMgPiAqOmFjdGl2ZSB7XFxuICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gIGNvbG9yOiB3aGl0ZTtcXG59XFxuXFxuLmdhbWVtb2RlX2J0bnMgPiAqID4gc3BhbiB7XFxuICBmb250LXNpemU6IDJlbTtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjbmF2YmFyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIHotaW5kZXg6IDE7XG59XG5cbiNuYXZiYXIgPiAqIHtcbiAgZGlzcGxheTogZmxleDtcbiAgbGlzdC1zdHlsZTogbm9uZTtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgZ2FwOiB2YXIoLS1mbGV4LWdhcC1zbWFsbCk7XG59XG5cbi5uYXZfcmlnaHQge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG59XG5cbi5uYXZfcmlnaHQgPiA6bGFzdC1jaGlsZCB7XG4gIC8qIEV4cGVyaW1lbnRpbmcgKi9cbiAgcG9zaXRpb246IGFic29sdXRlO1xuICByaWdodDogMDtcbiAgdG9wOiAyLjVlbTtcbiAgcGFkZGluZzogMXJlbTtcbn1cblxuLm5hdl9pdGVtIHtcbiAgY29sb3I6IHZhcigtLWNvbG9yLWZvbnQtcHJpbWFyeSk7XG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcbiAgZm9udC1zaXplOiAxLjJyZW07XG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbn1cblxuLm5hdl9pdGVtOm5vdCguZ2l0aHViKTpob3ZlciB7XG4gIGNvbG9yOiB3aGl0ZTtcbn1cblxuLm5hdl9pdGVtID4gc3ZnIHtcbiAgY29sb3I6IHdoaXRlO1xuICB3aWR0aDogMi41cmVtO1xuICBoZWlnaHQ6IGF1dG87XG59XG5cbi5uYXZfaXRlbSA+IC5naXRodWJfbG9nbzpob3ZlciB7XG4gIGNvbG9yOiByZ2IoMTQ5LCAwLCAyNTUpO1xuICBhbmltYXRpb246IGxpbmVhciAycyBpbmZpbml0ZSByb3RhdGU7XG59XG5cbi5uYXZfaXRlbS5uYXZfbG9nbyB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGdhcDogdmFyKC0tZmxleC1nYXAtc21hbGwpO1xufVxuXG4ubmF2X2l0ZW0ubmF2X2xvZ28gPiBoMSB7XG4gIGZvbnQtc2l6ZTogMnJlbTtcbn1cblxuLmxlYXZlX2dhbWUuaW5hY3RpdmUge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG5Aa2V5ZnJhbWVzIHJvdGF0ZSB7XG4gIDAlIHtcbiAgICB0cmFuc2Zvcm06IHJvdGF0ZSgwZGVnKTtcbiAgfVxuXG4gIDEwMCUge1xuICAgIHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7XG4gIH1cbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9uYXZiYXIuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtFQUNiLDhCQUE4QjtFQUM5QixrQkFBa0I7RUFDbEIsVUFBVTtBQUNaOztBQUVBO0VBQ0UsYUFBYTtFQUNiLGdCQUFnQjtFQUNoQixtQkFBbUI7RUFDbkIsMEJBQTBCO0FBQzVCOztBQUVBO0VBQ0Usa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLGtCQUFrQjtFQUNsQixRQUFRO0VBQ1IsVUFBVTtFQUNWLGFBQWE7QUFDZjs7QUFFQTtFQUNFLGdDQUFnQztFQUNoQyxrQkFBa0I7RUFDbEIsaUJBQWlCO0VBQ2pCLHFCQUFxQjtBQUN2Qjs7QUFFQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLFlBQVk7RUFDWixhQUFhO0VBQ2IsWUFBWTtBQUNkOztBQUVBO0VBQ0UsdUJBQXVCO0VBQ3ZCLG9DQUFvQztBQUN0Qzs7QUFFQTtFQUNFLGFBQWE7RUFDYixtQkFBbUI7RUFDbkIsMEJBQTBCO0FBQzVCOztBQUVBO0VBQ0UsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFO0lBQ0UsdUJBQXVCO0VBQ3pCOztFQUVBO0lBQ0UseUJBQXlCO0VBQzNCO0FBQ0ZcIixcInNvdXJjZXNDb250ZW50XCI6W1wiI25hdmJhciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgei1pbmRleDogMTtcXG59XFxuXFxuI25hdmJhciA+ICoge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGxpc3Qtc3R5bGU6IG5vbmU7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgZ2FwOiB2YXIoLS1mbGV4LWdhcC1zbWFsbCk7XFxufVxcblxcbi5uYXZfcmlnaHQge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG5cXG4ubmF2X3JpZ2h0ID4gOmxhc3QtY2hpbGQge1xcbiAgLyogRXhwZXJpbWVudGluZyAqL1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgcmlnaHQ6IDA7XFxuICB0b3A6IDIuNWVtO1xcbiAgcGFkZGluZzogMXJlbTtcXG59XFxuXFxuLm5hdl9pdGVtIHtcXG4gIGNvbG9yOiB2YXIoLS1jb2xvci1mb250LXByaW1hcnkpO1xcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xcbiAgZm9udC1zaXplOiAxLjJyZW07XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxufVxcblxcbi5uYXZfaXRlbTpub3QoLmdpdGh1Yik6aG92ZXIge1xcbiAgY29sb3I6IHdoaXRlO1xcbn1cXG5cXG4ubmF2X2l0ZW0gPiBzdmcge1xcbiAgY29sb3I6IHdoaXRlO1xcbiAgd2lkdGg6IDIuNXJlbTtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuXFxuLm5hdl9pdGVtID4gLmdpdGh1Yl9sb2dvOmhvdmVyIHtcXG4gIGNvbG9yOiByZ2IoMTQ5LCAwLCAyNTUpO1xcbiAgYW5pbWF0aW9uOiBsaW5lYXIgMnMgaW5maW5pdGUgcm90YXRlO1xcbn1cXG5cXG4ubmF2X2l0ZW0ubmF2X2xvZ28ge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICBnYXA6IHZhcigtLWZsZXgtZ2FwLXNtYWxsKTtcXG59XFxuXFxuLm5hdl9pdGVtLm5hdl9sb2dvID4gaDEge1xcbiAgZm9udC1zaXplOiAycmVtO1xcbn1cXG5cXG4ubGVhdmVfZ2FtZS5pbmFjdGl2ZSB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG5cXG5Aa2V5ZnJhbWVzIHJvdGF0ZSB7XFxuICAwJSB7XFxuICAgIHRyYW5zZm9ybTogcm90YXRlKDBkZWcpO1xcbiAgfVxcblxcbiAgMTAwJSB7XFxuICAgIHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7XFxuICB9XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgI25vdGlmaWNhdGlvbnNfY29udGFpbmVyIHtcbiAgLyogZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7ICovXG5cbiAgd2lkdGg6IDEwMCU7XG4gIGxlZnQ6IDA7XG4gIHRvcDogMDtcbiAgcG9zaXRpb246IGFic29sdXRlO1xufVxuXG4jbm90aWZpY2F0aW9uc19jb250YWluZXIgPiAubm90aWZpY2F0aW9uX3dyYXBwZXIge1xuICAvKiB3aWR0aDogMzAlO1xuICBwYWRkaW5nOiAxcmVtOyAqL1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgbWFyZ2luOiA0MHB4IGF1dG87XG4gIHdpZHRoOiA0MCU7XG4gIGhlaWdodDogbWF4LWNvbnRlbnQ7XG4gIGJhY2tncm91bmQ6ICNmOGY4Zjg7XG4gIHBhZGRpbmc6IDAuNWVtO1xuICB1c2VyLXNlbGVjdDogbm9uZTtcbn1cblxuI25vdGlmaWNhdGlvbnNfY29udGFpbmVyLmdhbWVvdmVyIHtcbiAgaGVpZ2h0OiAxMDAlO1xuICB6LWluZGV4OiA5OTk7XG4gIGJhY2tncm91bmQ6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC41KTtcbn1cblxuI25vdGlmaWNhdGlvbnNfY29udGFpbmVyLmdhbWVvdmVyID4gLm5vdGlmaWNhdGlvbl93cmFwcGVyIHtcbiAgcGFkZGluZzogMXJlbTtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDgsIDE5NSwgOCk7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGdhcDogMXJlbTtcbn1cblxuLm5vdGlmaWNhdGlvbl93cmFwcGVyID4gLnBsYXlfYWdhaW4ge1xuICBjb2xvcjogdmFyKC0tY29sb3ItZm9udC1wcmltYXJ5KTtcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICBwYWRkaW5nOiB2YXIoLS1wYWRkaW5nLXNtYWxsLWJ0bik7XG4gIGJhY2tncm91bmQtY29sb3I6IGxpZ2h0Z3JheTtcbiAgd2lkdGg6IG1heC1jb250ZW50O1xuICBib3JkZXItcmFkaXVzOiB2YXIoLS1ib3JkZXItcmFkaXVzLWJ0bik7XG59XG5cbi5ub3RpZmljYXRpb25fd3JhcHBlciA+IC5wbGF5X2FnYWluOmhvdmVyIHtcbiAgYm94LXNoYWRvdzogMHJlbSAwcmVtIDAuM3JlbSAtMC4xcmVtIGJsYWNrO1xuICBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNik7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9zdHlsZXMvbm90aWZpY2F0aW9ucy5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRTs0QkFDMEI7O0VBRTFCLFdBQVc7RUFDWCxPQUFPO0VBQ1AsTUFBTTtFQUNOLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFO2tCQUNnQjtFQUNoQixhQUFhO0VBQ2IsdUJBQXVCO0VBQ3ZCLGlCQUFpQjtFQUNqQixVQUFVO0VBQ1YsbUJBQW1CO0VBQ25CLG1CQUFtQjtFQUNuQixjQUFjO0VBQ2QsaUJBQWlCO0FBQ25COztBQUVBO0VBQ0UsWUFBWTtFQUNaLFlBQVk7RUFDWixvQ0FBb0M7QUFDdEM7O0FBRUE7RUFDRSxhQUFhO0VBQ2IsZ0NBQWdDO0VBQ2hDLHNCQUFzQjtFQUN0QixTQUFTO0FBQ1g7O0FBRUE7RUFDRSxnQ0FBZ0M7RUFDaEMscUJBQXFCO0VBQ3JCLGlDQUFpQztFQUNqQywyQkFBMkI7RUFDM0Isa0JBQWtCO0VBQ2xCLHVDQUF1QztBQUN6Qzs7QUFFQTtFQUNFLDBDQUEwQztFQUMxQyxvQ0FBb0M7QUFDdENcIixcInNvdXJjZXNDb250ZW50XCI6W1wiI25vdGlmaWNhdGlvbnNfY29udGFpbmVyIHtcXG4gIC8qIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgKi9cXG5cXG4gIHdpZHRoOiAxMDAlO1xcbiAgbGVmdDogMDtcXG4gIHRvcDogMDtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG59XFxuXFxuI25vdGlmaWNhdGlvbnNfY29udGFpbmVyID4gLm5vdGlmaWNhdGlvbl93cmFwcGVyIHtcXG4gIC8qIHdpZHRoOiAzMCU7XFxuICBwYWRkaW5nOiAxcmVtOyAqL1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbiAgbWFyZ2luOiA0MHB4IGF1dG87XFxuICB3aWR0aDogNDAlO1xcbiAgaGVpZ2h0OiBtYXgtY29udGVudDtcXG4gIGJhY2tncm91bmQ6ICNmOGY4Zjg7XFxuICBwYWRkaW5nOiAwLjVlbTtcXG4gIHVzZXItc2VsZWN0OiBub25lO1xcbn1cXG5cXG4jbm90aWZpY2F0aW9uc19jb250YWluZXIuZ2FtZW92ZXIge1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgei1pbmRleDogOTk5O1xcbiAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjUpO1xcbn1cXG5cXG4jbm90aWZpY2F0aW9uc19jb250YWluZXIuZ2FtZW92ZXIgPiAubm90aWZpY2F0aW9uX3dyYXBwZXIge1xcbiAgcGFkZGluZzogMXJlbTtcXG4gIGJhY2tncm91bmQtY29sb3I6IHJnYig4LCAxOTUsIDgpO1xcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gIGdhcDogMXJlbTtcXG59XFxuXFxuLm5vdGlmaWNhdGlvbl93cmFwcGVyID4gLnBsYXlfYWdhaW4ge1xcbiAgY29sb3I6IHZhcigtLWNvbG9yLWZvbnQtcHJpbWFyeSk7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxuICBwYWRkaW5nOiB2YXIoLS1wYWRkaW5nLXNtYWxsLWJ0bik7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBsaWdodGdyYXk7XFxuICB3aWR0aDogbWF4LWNvbnRlbnQ7XFxuICBib3JkZXItcmFkaXVzOiB2YXIoLS1ib3JkZXItcmFkaXVzLWJ0bik7XFxufVxcblxcbi5ub3RpZmljYXRpb25fd3JhcHBlciA+IC5wbGF5X2FnYWluOmhvdmVyIHtcXG4gIGJveC1zaGFkb3c6IDByZW0gMHJlbSAwLjNyZW0gLTAuMXJlbSBibGFjaztcXG4gIGJhY2tncm91bmQ6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC42KTtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAucG9ydF9saW5lcyB7XG4gIGRpc3BsYXk6IGZsZXg7XG59XG5cbi5wb3J0X3NoaXAge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGJvcmRlcjogMXB4IGRvdHRlZCAjYjJiMmI5O1xuICBtYXJnaW46IDAuNWVtO1xuICAvKiBib3gtc2l6aW5nOiBjb250ZW50LWJveDsgKi9cbn1cblxuLnNoaXBfYm94IHtcbiAgei1pbmRleDogMjtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDI1NSwgMC4wNSk7XG4gIGJvcmRlcjogMnB4IHNvbGlkICMwMGY7XG4gIGxlZnQ6IDA7XG4gIHRvcDogMDtcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXG59XG5cbi5zaGlwX2JveDpob3ZlciB7XG4gIGN1cnNvcjogbW92ZTtcbn1cblxuLmNlbGxfY29udGVudCA+IC5zaGlwX2JveCB7XG4gIC8qIENvbW1lbnQgb3V0IGlmIHVzaW5nIGJveC1zaXppbmc6IGNvbnRlbnQgKi9cbiAgbGVmdDogLTQlO1xuICB0b3A6IC00JTtcbn1cblxuLnNoaXBfYm94LmRyYWdnaW5nLnNoaXBfYm94X3RyYW5zcGFyZW50IHtcbiAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gIGJvcmRlcjogdHJhbnNwYXJlbnQ7XG59XG5cbi5zaGlwX2JveF9wbGFjZWhvbGRlciB7XG4gIGJvcmRlci13aWR0aDogM3B4O1xuICBib3JkZXItY29sb3I6ICM0MGJmNDQ7XG4gIGJhY2tncm91bmQ6IHJnYmEoNjQsIDE5MSwgNjgsIDAuMDUpO1xufVxuXG4ucm90YXRlX2Vycm9yIHtcbiAgYm9yZGVyLWNvbG9yOiByZWQ7XG4gIGFuaW1hdGlvbjogbGluZWFyIDAuMDA1cyBpbmZpbml0ZSBzaGFrZTtcbn1cblxuLmJ0bnNfY29udGFpbmVyIHtcbiAgZGlzcGxheTogZmxleDtcbiAgbWFyZ2luLXRvcDogMXJlbTtcbiAgZ2FwOiAwLjI1cmVtO1xufVxuXG4uYnRuc19jb250YWluZXIgPiAqIGJ1dHRvbiB7XG4gIHBhZGRpbmc6IDAuNXJlbSAxcmVtO1xufVxuXG4ucmVzZXRfYnRuLmluYWN0aXZlIHtcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG59XG5cbi5yZXNldF9idG4uaW5hY3RpdmUgPiBzcGFuIHtcbiAgb3BhY2l0eTogMC41O1xufVxuXG4ucmFuZG9tX2J0biB7XG4gIGRpc3BsYXk6IG5vbmU7XG59XG5cbi5yZWFkeV9idG4uaW5hY3RpdmUge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG5Aa2V5ZnJhbWVzIHNoYWtlIHtcbiAgMCUge1xuICAgIGxlZnQ6IC01cHg7XG4gIH1cblxuICA1MCUge1xuICAgIGxlZnQ6IDBweDtcbiAgfVxuXG4gIDEwMCUge1xuICAgIGxlZnQ6IDVweDtcbiAgfVxufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL3BvcnQuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLDBCQUEwQjtFQUMxQixhQUFhO0VBQ2IsNkJBQTZCO0FBQy9COztBQUVBO0VBQ0UsVUFBVTtFQUNWLGtCQUFrQjtFQUNsQixpQ0FBaUM7RUFDakMsc0JBQXNCO0VBQ3RCLE9BQU87RUFDUCxNQUFNO0VBQ04sNkJBQTZCO0FBQy9COztBQUVBO0VBQ0UsWUFBWTtBQUNkOztBQUVBO0VBQ0UsNkNBQTZDO0VBQzdDLFNBQVM7RUFDVCxRQUFRO0FBQ1Y7O0FBRUE7RUFDRSx1QkFBdUI7RUFDdkIsbUJBQW1CO0FBQ3JCOztBQUVBO0VBQ0UsaUJBQWlCO0VBQ2pCLHFCQUFxQjtFQUNyQixtQ0FBbUM7QUFDckM7O0FBRUE7RUFDRSxpQkFBaUI7RUFDakIsdUNBQXVDO0FBQ3pDOztBQUVBO0VBQ0UsYUFBYTtFQUNiLGdCQUFnQjtFQUNoQixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxvQkFBb0I7QUFDdEI7O0FBRUE7RUFDRSxvQkFBb0I7QUFDdEI7O0FBRUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxhQUFhO0FBQ2Y7O0FBRUE7RUFDRSxhQUFhO0FBQ2Y7O0FBRUE7RUFDRTtJQUNFLFVBQVU7RUFDWjs7RUFFQTtJQUNFLFNBQVM7RUFDWDs7RUFFQTtJQUNFLFNBQVM7RUFDWDtBQUNGXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIi5wb3J0X2xpbmVzIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxufVxcblxcbi5wb3J0X3NoaXAge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgYm9yZGVyOiAxcHggZG90dGVkICNiMmIyYjk7XFxuICBtYXJnaW46IDAuNWVtO1xcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXFxufVxcblxcbi5zaGlwX2JveCB7XFxuICB6LWluZGV4OiAyO1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAyNTUsIDAuMDUpO1xcbiAgYm9yZGVyOiAycHggc29saWQgIzAwZjtcXG4gIGxlZnQ6IDA7XFxuICB0b3A6IDA7XFxuICAvKiBib3gtc2l6aW5nOiBjb250ZW50LWJveDsgKi9cXG59XFxuXFxuLnNoaXBfYm94OmhvdmVyIHtcXG4gIGN1cnNvcjogbW92ZTtcXG59XFxuXFxuLmNlbGxfY29udGVudCA+IC5zaGlwX2JveCB7XFxuICAvKiBDb21tZW50IG91dCBpZiB1c2luZyBib3gtc2l6aW5nOiBjb250ZW50ICovXFxuICBsZWZ0OiAtNCU7XFxuICB0b3A6IC00JTtcXG59XFxuXFxuLnNoaXBfYm94LmRyYWdnaW5nLnNoaXBfYm94X3RyYW5zcGFyZW50IHtcXG4gIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyOiB0cmFuc3BhcmVudDtcXG59XFxuXFxuLnNoaXBfYm94X3BsYWNlaG9sZGVyIHtcXG4gIGJvcmRlci13aWR0aDogM3B4O1xcbiAgYm9yZGVyLWNvbG9yOiAjNDBiZjQ0O1xcbiAgYmFja2dyb3VuZDogcmdiYSg2NCwgMTkxLCA2OCwgMC4wNSk7XFxufVxcblxcbi5yb3RhdGVfZXJyb3Ige1xcbiAgYm9yZGVyLWNvbG9yOiByZWQ7XFxuICBhbmltYXRpb246IGxpbmVhciAwLjAwNXMgaW5maW5pdGUgc2hha2U7XFxufVxcblxcbi5idG5zX2NvbnRhaW5lciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgbWFyZ2luLXRvcDogMXJlbTtcXG4gIGdhcDogMC4yNXJlbTtcXG59XFxuXFxuLmJ0bnNfY29udGFpbmVyID4gKiBidXR0b24ge1xcbiAgcGFkZGluZzogMC41cmVtIDFyZW07XFxufVxcblxcbi5yZXNldF9idG4uaW5hY3RpdmUge1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxufVxcblxcbi5yZXNldF9idG4uaW5hY3RpdmUgPiBzcGFuIHtcXG4gIG9wYWNpdHk6IDAuNTtcXG59XFxuXFxuLnJhbmRvbV9idG4ge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuXFxuLnJlYWR5X2J0bi5pbmFjdGl2ZSB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG5cXG5Aa2V5ZnJhbWVzIHNoYWtlIHtcXG4gIDAlIHtcXG4gICAgbGVmdDogLTVweDtcXG4gIH1cXG5cXG4gIDUwJSB7XFxuICAgIGxlZnQ6IDBweDtcXG4gIH1cXG5cXG4gIDEwMCUge1xcbiAgICBsZWZ0OiA1cHg7XFxuICB9XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgI2JvYXJkc19jb250YWluZXIge1xuICBtYXJnaW4tdG9wOiA0ZW07XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGdhcDogOHJlbTtcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICoge1xuICBkaXNwbGF5OiBmbGV4O1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICoud2FpdCA+ICo6bm90KC5nYW1lX3BsYXkpIHtcbiAgb3BhY2l0eTogMC40O1xuICBwb2ludGVyLWV2ZW50czogbm9uZTtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsIHtcbiAgYm9yZGVyOiBub25lO1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lci5idXN5ID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbDpub3QoLmhpdCk6bm90KC5taXNzKSB7XG4gIGN1cnNvcjogcG9pbnRlcjtcbn1cblxuI2JvYXJkc19jb250YWluZXIuYnVzeSA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGw6bm90KC5oaXQpOm5vdCgubWlzcyk6aG92ZXIgPiAuY2VsbF9jb250ZW50IHtcbiAgYm9yZGVyLXdpZHRoOiAzcHg7XG4gIGJvcmRlci1jb2xvcjogZ3JlZW47XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKjpub3QoLndhaXQpID4gKiA+ICogPiAuY2VsbCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xufVxuXG4ucGxheWVyX29uZSxcbi5wbGF5ZXJfdHdvIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICB3aWR0aDogbWluLWNvbnRlbnQ7XG59XG5cbi5wbGF5ZXJfdHdvLmluYWN0aXZlIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLnBsYXlfYnRuLmluYWN0aXZlIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLnBsYXlfYnRuIHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAxMCU7XG4gIHBhZGRpbmc6IHZhcigtLXBhZGRpbmctbWVkLWJ0bik7XG59XG5cbi5wbGF5X2J0biA+IGJ1dHRvbiB7XG4gIGZvbnQtc2l6ZTogNHJlbTtcbn1cblxuLmNlbGwgPiAqIHtcbiAgd2lkdGg6IDJlbTtcbiAgaGVpZ2h0OiAyZW07XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XG4gIC8qIHBvaW50ZXItZXZlbnRzOiBub25lOyAqL1xuICBib3JkZXI6IDFweCBzb2xpZCBibGFjaztcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXG59XG5cbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcbiAgLypcbiAgU2hvdyBzaGlwIGR1cmluZyBwbGFjaW5nIHNoaXBzIHBoYXNlXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxuICAqL1xuICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgaGVpZ2h0OiAxMDAlO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiBjb3JuZmxvd2VyYmx1ZTtcbn1cblxuLmNlbGwgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXIge1xuICBkaXNwbGF5OiBibG9jaztcbn1cblxuLmNlbGwuZG9uZSA+IC5jZWxsX2NvbnRlbnQge1xuICBib3JkZXItY29sb3I6IHJlZDtcbiAgYm9yZGVyLXdpZHRoOiAycHg7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXA6OmJlZm9yZSxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXA6OmFmdGVyIHtcbiAgLyogT3JpZ2luYWwgdmFsdWVzICovXG4gIC8qXG4gIGxlZnQ6IDUwJTtcbiAgd2lkdGg6IDJweDtcbiAgdG9wOiAtMjUlO1xuICBoZWlnaHQ6IDE1MCU7XG4gICovXG4gIGNvbnRlbnQ6ICcnO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGJhY2tncm91bmQ6IHJlZDtcbiAgbGVmdDogNDUlO1xuICB3aWR0aDogM3B4O1xuICB0b3A6IC0xMCU7XG4gIGhlaWdodDogMTIwJTtcbiAgei1pbmRleDogMjtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcDo6YmVmb3JlIHtcbiAgLyogT3JpZ2luYWwgKi9cbiAgdHJhbnNmb3JtOiByb3RhdGUoNDVkZWcpO1xuICBtYXJnaW4tdG9wOiAxcHg7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXA6OmFmdGVyIHtcbiAgLyogT3JpZ2luYWwgKi9cbiAgdHJhbnNmb3JtOiByb3RhdGUoLTQ1ZGVnKTtcbiAgbWFyZ2luLXRvcDogMXB4O1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwubWlzcyA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiA1MCU7XG4gIGxlZnQ6IDUwJTtcbiAgaGVpZ2h0OiA0cHg7XG4gIHdpZHRoOiA0cHg7XG4gIGJhY2tncm91bmQ6ICMzMzM7XG4gIGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgbWFyZ2luLXRvcDogLTJweDtcbiAgbWFyZ2luLWxlZnQ6IC0ycHg7XG4gIHotaW5kZXg6IDE7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5kb25lID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBib3JkZXI6IDRweCBzb2xpZCByZWQ7XG4gIHRvcDogLTJweDtcbiAgbGVmdDogLTJweDtcbiAgei1pbmRleDogMjtcbiAgd2lkdGg6IGluaGVyaXQ7XG4gIGhlaWdodDogaW5oZXJpdDtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50IHtcbiAgYmFja2dyb3VuZC1jb2xvcjogI2UxZTNlODtcbn1cblxuLmNlbGxfY29udGVudCA+IC5yb3dfbWFya2VyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICBoZWlnaHQ6IDEwMCU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGxlZnQ6IC0yZW07XG4gIHRvcDogMDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgei1pbmRleDogLTE7XG59XG5cbi5jZWxsX2NvbnRlbnQgPiAuY29sX21hcmtlciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAtMmVtO1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIHdpZHRoOiAxMDAlO1xuICB6LWluZGV4OiAtMTtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGVBQWU7RUFDZixhQUFhO0VBQ2IsU0FBUztFQUNULGlCQUFpQjtBQUNuQjs7QUFFQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLFlBQVk7RUFDWixvQkFBb0I7QUFDdEI7O0FBRUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxlQUFlO0FBQ2pCOztBQUVBO0VBQ0UsaUJBQWlCO0VBQ2pCLG1CQUFtQjtBQUNyQjs7QUFFQTtFQUNFLDZCQUE2QjtBQUMvQjs7QUFFQTs7RUFFRSxrQkFBa0I7RUFDbEIsa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0UsY0FBYztFQUNkLGtCQUFrQjtFQUNsQixRQUFRO0VBQ1IsK0JBQStCO0FBQ2pDOztBQUVBO0VBQ0UsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLFVBQVU7RUFDVixXQUFXO0VBQ1gsa0JBQWtCO0VBQ2xCLHVCQUF1QjtFQUN2QiwwQkFBMEI7RUFDMUIsdUJBQXVCO0VBQ3ZCLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFOzs7R0FHQztFQUNELG9CQUFvQjtFQUNwQixZQUFZO0VBQ1osZ0NBQWdDO0FBQ2xDOztBQUVBO0VBQ0UsY0FBYztBQUNoQjs7QUFFQTtFQUNFLGlCQUFpQjtFQUNqQixpQkFBaUI7QUFDbkI7O0FBRUE7O0VBRUUsb0JBQW9CO0VBQ3BCOzs7OztHQUtDO0VBQ0QsV0FBVztFQUNYLGtCQUFrQjtFQUNsQixlQUFlO0VBQ2YsU0FBUztFQUNULFVBQVU7RUFDVixTQUFTO0VBQ1QsWUFBWTtFQUNaLFVBQVU7QUFDWjs7QUFFQTtFQUNFLGFBQWE7RUFDYix3QkFBd0I7RUFDeEIsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLGFBQWE7RUFDYix5QkFBeUI7RUFDekIsZUFBZTtBQUNqQjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixRQUFRO0VBQ1IsU0FBUztFQUNULFdBQVc7RUFDWCxVQUFVO0VBQ1YsZ0JBQWdCO0VBQ2hCLGtCQUFrQjtFQUNsQixnQkFBZ0I7RUFDaEIsaUJBQWlCO0VBQ2pCLFVBQVU7QUFDWjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixxQkFBcUI7RUFDckIsU0FBUztFQUNULFVBQVU7RUFDVixVQUFVO0VBQ1YsY0FBYztFQUNkLGVBQWU7QUFDakI7O0FBRUE7RUFDRSx5QkFBeUI7QUFDM0I7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsWUFBWTtFQUNaLGFBQWE7RUFDYixVQUFVO0VBQ1YsTUFBTTtFQUNOLG1CQUFtQjtFQUNuQixXQUFXO0FBQ2I7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsU0FBUztFQUNULGtCQUFrQjtFQUNsQixXQUFXO0VBQ1gsV0FBVztBQUNiXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNib2FyZHNfY29udGFpbmVyIHtcXG4gIG1hcmdpbi10b3A6IDRlbTtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBnYXA6IDhyZW07XFxuICB1c2VyLXNlbGVjdDogbm9uZTtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICoud2FpdCA+ICo6bm90KC5nYW1lX3BsYXkpIHtcXG4gIG9wYWNpdHk6IDAuNDtcXG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwge1xcbiAgYm9yZGVyOiBub25lO1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lci5idXN5ID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbDpub3QoLmhpdCk6bm90KC5taXNzKSB7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyLmJ1c3kgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsOm5vdCguaGl0KTpub3QoLm1pc3MpOmhvdmVyID4gLmNlbGxfY29udGVudCB7XFxuICBib3JkZXItd2lkdGg6IDNweDtcXG4gIGJvcmRlci1jb2xvcjogZ3JlZW47XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKjpub3QoLndhaXQpID4gKiA+ICogPiAuY2VsbCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG59XFxuXFxuLnBsYXllcl9vbmUsXFxuLnBsYXllcl90d28ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgd2lkdGg6IG1pbi1jb250ZW50O1xcbn1cXG5cXG4ucGxheWVyX3R3by5pbmFjdGl2ZSB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG5cXG4ucGxheV9idG4uaW5hY3RpdmUge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuXFxuLnBsYXlfYnRuIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAxMCU7XFxuICBwYWRkaW5nOiB2YXIoLS1wYWRkaW5nLW1lZC1idG4pO1xcbn1cXG5cXG4ucGxheV9idG4gPiBidXR0b24ge1xcbiAgZm9udC1zaXplOiA0cmVtO1xcbn1cXG5cXG4uY2VsbCA+ICoge1xcbiAgd2lkdGg6IDJlbTtcXG4gIGhlaWdodDogMmVtO1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxuICAvKiBwb2ludGVyLWV2ZW50czogbm9uZTsgKi9cXG4gIGJvcmRlcjogMXB4IHNvbGlkIGJsYWNrO1xcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXFxufVxcblxcbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcXG4gIC8qXFxuICBTaG93IHNoaXAgZHVyaW5nIHBsYWNpbmcgc2hpcHMgcGhhc2VcXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxcbiAgKi9cXG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogY29ybmZsb3dlcmJsdWU7XFxufVxcblxcbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG5cXG4uY2VsbC5kb25lID4gLmNlbGxfY29udGVudCB7XFxuICBib3JkZXItY29sb3I6IHJlZDtcXG4gIGJvcmRlci13aWR0aDogMnB4O1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwOjpiZWZvcmUsXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcDo6YWZ0ZXIge1xcbiAgLyogT3JpZ2luYWwgdmFsdWVzICovXFxuICAvKlxcbiAgbGVmdDogNTAlO1xcbiAgd2lkdGg6IDJweDtcXG4gIHRvcDogLTI1JTtcXG4gIGhlaWdodDogMTUwJTtcXG4gICovXFxuICBjb250ZW50OiAnJztcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGJhY2tncm91bmQ6IHJlZDtcXG4gIGxlZnQ6IDQ1JTtcXG4gIHdpZHRoOiAzcHg7XFxuICB0b3A6IC0xMCU7XFxuICBoZWlnaHQ6IDEyMCU7XFxuICB6LWluZGV4OiAyO1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwOjpiZWZvcmUge1xcbiAgLyogT3JpZ2luYWwgKi9cXG4gIHRyYW5zZm9ybTogcm90YXRlKDQ1ZGVnKTtcXG4gIG1hcmdpbi10b3A6IDFweDtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcDo6YWZ0ZXIge1xcbiAgLyogT3JpZ2luYWwgKi9cXG4gIHRyYW5zZm9ybTogcm90YXRlKC00NWRlZyk7XFxuICBtYXJnaW4tdG9wOiAxcHg7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5taXNzID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogNTAlO1xcbiAgbGVmdDogNTAlO1xcbiAgaGVpZ2h0OiA0cHg7XFxuICB3aWR0aDogNHB4O1xcbiAgYmFja2dyb3VuZDogIzMzMztcXG4gIGJvcmRlci1yYWRpdXM6IDUwJTtcXG4gIG1hcmdpbi10b3A6IC0ycHg7XFxuICBtYXJnaW4tbGVmdDogLTJweDtcXG4gIHotaW5kZXg6IDE7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5kb25lID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGJvcmRlcjogNHB4IHNvbGlkIHJlZDtcXG4gIHRvcDogLTJweDtcXG4gIGxlZnQ6IC0ycHg7XFxuICB6LWluZGV4OiAyO1xcbiAgd2lkdGg6IGluaGVyaXQ7XFxuICBoZWlnaHQ6IGluaGVyaXQ7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5taXNzID4gLmNlbGxfY29udGVudCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTFlM2U4O1xcbn1cXG5cXG4uY2VsbF9jb250ZW50ID4gLnJvd19tYXJrZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGxlZnQ6IC0yZW07XFxuICB0b3A6IDA7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgei1pbmRleDogLTE7XFxufVxcblxcbi5jZWxsX2NvbnRlbnQgPiAuY29sX21hcmtlciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IC0yZW07XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB3aWR0aDogMTAwJTtcXG4gIHotaW5kZXg6IC0xO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gIE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gIEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKSB7XG4gIHZhciBsaXN0ID0gW107XG5cbiAgLy8gcmV0dXJuIHRoZSBsaXN0IG9mIG1vZHVsZXMgYXMgY3NzIHN0cmluZ1xuICBsaXN0LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICB2YXIgY29udGVudCA9IFwiXCI7XG4gICAgICB2YXIgbmVlZExheWVyID0gdHlwZW9mIGl0ZW1bNV0gIT09IFwidW5kZWZpbmVkXCI7XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpO1xuICAgICAgfVxuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBjb250ZW50ICs9IGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcoaXRlbSk7XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bNF0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0pLmpvaW4oXCJcIik7XG4gIH07XG5cbiAgLy8gaW1wb3J0IGEgbGlzdCBvZiBtb2R1bGVzIGludG8gdGhlIGxpc3RcbiAgbGlzdC5pID0gZnVuY3Rpb24gaShtb2R1bGVzLCBtZWRpYSwgZGVkdXBlLCBzdXBwb3J0cywgbGF5ZXIpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZXMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIHVuZGVmaW5lZF1dO1xuICAgIH1cbiAgICB2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuICAgIGlmIChkZWR1cGUpIHtcbiAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5sZW5ndGg7IGsrKykge1xuICAgICAgICB2YXIgaWQgPSB0aGlzW2tdWzBdO1xuICAgICAgICBpZiAoaWQgIT0gbnVsbCkge1xuICAgICAgICAgIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBfayA9IDA7IF9rIDwgbW9kdWxlcy5sZW5ndGg7IF9rKyspIHtcbiAgICAgIHZhciBpdGVtID0gW10uY29uY2F0KG1vZHVsZXNbX2tdKTtcbiAgICAgIGlmIChkZWR1cGUgJiYgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpdGVtWzBdXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbGF5ZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtWzVdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWVkaWEpIHtcbiAgICAgICAgaWYgKCFpdGVtWzJdKSB7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN1cHBvcnRzKSB7XG4gICAgICAgIGlmICghaXRlbVs0XSkge1xuICAgICAgICAgIGl0ZW1bNF0gPSBcIlwiLmNvbmNhdChzdXBwb3J0cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzRdID0gc3VwcG9ydHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGxpc3QucHVzaChpdGVtKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBsaXN0O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBpZiAoIXVybCkge1xuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgdXJsID0gU3RyaW5nKHVybC5fX2VzTW9kdWxlID8gdXJsLmRlZmF1bHQgOiB1cmwpO1xuXG4gIC8vIElmIHVybCBpcyBhbHJlYWR5IHdyYXBwZWQgaW4gcXVvdGVzLCByZW1vdmUgdGhlbVxuICBpZiAoL15bJ1wiXS4qWydcIl0kLy50ZXN0KHVybCkpIHtcbiAgICB1cmwgPSB1cmwuc2xpY2UoMSwgLTEpO1xuICB9XG4gIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICB1cmwgKz0gb3B0aW9ucy5oYXNoO1xuICB9XG5cbiAgLy8gU2hvdWxkIHVybCBiZSB3cmFwcGVkP1xuICAvLyBTZWUgaHR0cHM6Ly9kcmFmdHMuY3Nzd2cub3JnL2Nzcy12YWx1ZXMtMy8jdXJsc1xuICBpZiAoL1tcIicoKSBcXHRcXG5dfCglMjApLy50ZXN0KHVybCkgfHwgb3B0aW9ucy5uZWVkUXVvdGVzKSB7XG4gICAgcmV0dXJuIFwiXFxcIlwiLmNvbmNhdCh1cmwucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpLCBcIlxcXCJcIik7XG4gIH1cbiAgcmV0dXJuIHVybDtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgdmFyIGNvbnRlbnQgPSBpdGVtWzFdO1xuICB2YXIgY3NzTWFwcGluZyA9IGl0ZW1bM107XG4gIGlmICghY3NzTWFwcGluZykge1xuICAgIHJldHVybiBjb250ZW50O1xuICB9XG4gIGlmICh0eXBlb2YgYnRvYSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KGNzc01hcHBpbmcpKSkpO1xuICAgIHZhciBkYXRhID0gXCJzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxcIi5jb25jYXQoYmFzZTY0KTtcbiAgICB2YXIgc291cmNlTWFwcGluZyA9IFwiLyojIFwiLmNvbmNhdChkYXRhLCBcIiAqL1wiKTtcbiAgICByZXR1cm4gW2NvbnRlbnRdLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oXCJcXG5cIik7XG4gIH1cbiAgcmV0dXJuIFtjb250ZW50XS5qb2luKFwiXFxuXCIpO1xufTsiLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vYXBwLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vYXBwLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9oZWFkZXIuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9oZWFkZXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2hvbWUuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ob21lLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9uYXZiYXIuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9uYXZiYXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25vdGlmaWNhdGlvbnMuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ub3RpZmljYXRpb25zLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9wb3J0LmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vcG9ydC5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vc2NyZWVuQ29udHJvbGxlci5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3NjcmVlbkNvbnRyb2xsZXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzdHlsZXNJbkRPTSA9IFtdO1xuZnVuY3Rpb24gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICB2YXIgcmVzdWx0ID0gLTE7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3R5bGVzSW5ET00ubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3R5bGVzSW5ET01baV0uaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcikge1xuICAgICAgcmVzdWx0ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGlkQ291bnRNYXAgPSB7fTtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICB2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcbiAgICB2YXIgY291bnQgPSBpZENvdW50TWFwW2lkXSB8fCAwO1xuICAgIHZhciBpZGVudGlmaWVyID0gXCJcIi5jb25jYXQoaWQsIFwiIFwiKS5jb25jYXQoY291bnQpO1xuICAgIGlkQ291bnRNYXBbaWRdID0gY291bnQgKyAxO1xuICAgIHZhciBpbmRleEJ5SWRlbnRpZmllciA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgIHZhciBvYmogPSB7XG4gICAgICBjc3M6IGl0ZW1bMV0sXG4gICAgICBtZWRpYTogaXRlbVsyXSxcbiAgICAgIHNvdXJjZU1hcDogaXRlbVszXSxcbiAgICAgIHN1cHBvcnRzOiBpdGVtWzRdLFxuICAgICAgbGF5ZXI6IGl0ZW1bNV1cbiAgICB9O1xuICAgIGlmIChpbmRleEJ5SWRlbnRpZmllciAhPT0gLTEpIHtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS5yZWZlcmVuY2VzKys7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0udXBkYXRlcihvYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdXBkYXRlciA9IGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5ieUluZGV4ID0gaTtcbiAgICAgIHN0eWxlc0luRE9NLnNwbGljZShpLCAwLCB7XG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHVwZGF0ZXI6IHVwZGF0ZXIsXG4gICAgICAgIHJlZmVyZW5jZXM6IDFcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG4gIHJldHVybiBpZGVudGlmaWVycztcbn1cbmZ1bmN0aW9uIGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpIHtcbiAgdmFyIGFwaSA9IG9wdGlvbnMuZG9tQVBJKG9wdGlvbnMpO1xuICBhcGkudXBkYXRlKG9iaik7XG4gIHZhciB1cGRhdGVyID0gZnVuY3Rpb24gdXBkYXRlcihuZXdPYmopIHtcbiAgICBpZiAobmV3T2JqKSB7XG4gICAgICBpZiAobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwICYmIG5ld09iai5zdXBwb3J0cyA9PT0gb2JqLnN1cHBvcnRzICYmIG5ld09iai5sYXllciA9PT0gb2JqLmxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFwaS51cGRhdGUob2JqID0gbmV3T2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBpLnJlbW92ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHVwZGF0ZXI7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgdmFyIGxhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG4gICAgbmV3TGlzdCA9IG5ld0xpc3QgfHwgW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpZGVudGlmaWVyID0gbGFzdElkZW50aWZpZXJzW2ldO1xuICAgICAgdmFyIGluZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleF0ucmVmZXJlbmNlcy0tO1xuICAgIH1cbiAgICB2YXIgbmV3TGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKG5ld0xpc3QsIG9wdGlvbnMpO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuICAgICAgdmFyIF9pbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKF9pZGVudGlmaWVyKTtcbiAgICAgIGlmIChzdHlsZXNJbkRPTVtfaW5kZXhdLnJlZmVyZW5jZXMgPT09IDApIHtcbiAgICAgICAgc3R5bGVzSW5ET01bX2luZGV4XS51cGRhdGVyKCk7XG4gICAgICAgIHN0eWxlc0luRE9NLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBsYXN0SWRlbnRpZmllcnMgPSBuZXdMYXN0SWRlbnRpZmllcnM7XG4gIH07XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbWVtbyA9IHt9O1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGdldFRhcmdldCh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiBtZW1vW3RhcmdldF0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgc3R5bGVUYXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCk7XG5cbiAgICAvLyBTcGVjaWFsIGNhc2UgdG8gcmV0dXJuIGhlYWQgb2YgaWZyYW1lIGluc3RlYWQgb2YgaWZyYW1lIGl0c2VsZlxuICAgIGlmICh3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQgJiYgc3R5bGVUYXJnZXQgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgIC8vIGR1ZSB0byBjcm9zcy1vcmlnaW4gcmVzdHJpY3Rpb25zXG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gc3R5bGVUYXJnZXQuY29udGVudERvY3VtZW50LmhlYWQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0XG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgbWVtb1t0YXJnZXRdID0gc3R5bGVUYXJnZXQ7XG4gIH1cbiAgcmV0dXJuIG1lbW9bdGFyZ2V0XTtcbn1cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRCeVNlbGVjdG9yKGluc2VydCwgc3R5bGUpIHtcbiAgdmFyIHRhcmdldCA9IGdldFRhcmdldChpbnNlcnQpO1xuICBpZiAoIXRhcmdldCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGZpbmQgYSBzdHlsZSB0YXJnZXQuIFRoaXMgcHJvYmFibHkgbWVhbnMgdGhhdCB0aGUgdmFsdWUgZm9yIHRoZSAnaW5zZXJ0JyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG4gIH1cbiAgdGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0QnlTZWxlY3RvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgb3B0aW9ucy5zZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gIG9wdGlvbnMuaW5zZXJ0KGVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG4gIHJldHVybiBlbGVtZW50O1xufVxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzKHN0eWxlRWxlbWVudCkge1xuICB2YXIgbm9uY2UgPSB0eXBlb2YgX193ZWJwYWNrX25vbmNlX18gIT09IFwidW5kZWZpbmVkXCIgPyBfX3dlYnBhY2tfbm9uY2VfXyA6IG51bGw7XG4gIGlmIChub25jZSkge1xuICAgIHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJub25jZVwiLCBub25jZSk7XG4gIH1cbn1cbm1vZHVsZS5leHBvcnRzID0gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG4gIHZhciBjc3MgPSBcIlwiO1xuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQob2JqLnN1cHBvcnRzLCBcIikge1wiKTtcbiAgfVxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwiQG1lZGlhIFwiLmNvbmNhdChvYmoubWVkaWEsIFwiIHtcIik7XG4gIH1cbiAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBvYmoubGF5ZXIgIT09IFwidW5kZWZpbmVkXCI7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJAbGF5ZXJcIi5jb25jYXQob2JqLmxheWVyLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQob2JqLmxheWVyKSA6IFwiXCIsIFwiIHtcIik7XG4gIH1cbiAgY3NzICs9IG9iai5jc3M7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG4gIHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuICBpZiAoc291cmNlTWFwICYmIHR5cGVvZiBidG9hICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgY3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIi5jb25jYXQoYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSwgXCIgKi9cIik7XG4gIH1cblxuICAvLyBGb3Igb2xkIElFXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAgKi9cbiAgb3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbn1cbmZ1bmN0aW9uIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpIHtcbiAgLy8gaXN0YW5idWwgaWdub3JlIGlmXG4gIGlmIChzdHlsZUVsZW1lbnQucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBzdHlsZUVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQpO1xufVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGRvbUFQSShvcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUoKSB7fSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cbiAgICB9O1xuICB9XG4gIHZhciBzdHlsZUVsZW1lbnQgPSBvcHRpb25zLmluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICAgIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge1xuICAgICAgcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG4gICAgfVxuICB9O1xufVxubW9kdWxlLmV4cG9ydHMgPSBkb21BUEk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc3R5bGVUYWdUcmFuc2Zvcm0oY3NzLCBzdHlsZUVsZW1lbnQpIHtcbiAgaWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgIHN0eWxlRWxlbWVudC5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBzdHlsZVRhZ1RyYW5zZm9ybTsiLCJpbXBvcnQgJ0BpY29uZnUvc3ZnLWluamVjdCc7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgYnVpbGRIZWFkZXIgZnJvbSAnLi9jb21wb25lbnRzL2hlYWRlci9oZWFkZXInO1xuaW1wb3J0IGJ1aWxkTWFpbiBmcm9tICcuL2NvbXBvbmVudHMvbWFpbi9tYWluJztcbmltcG9ydCAnLi9hcHAuY3NzJztcblxuKCgpID0+IHtcbiAgY29uc3QgYnVpbGQgPSB7XG4gICAgaGVhZGVyOiBidWlsZEhlYWRlcixcbiAgICBtYWluOiBidWlsZE1haW4sXG4gIH07XG5cbiAgY29uc3QgYXBwID0ge1xuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgYXBwV3JhcHBlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgYXBwV3JhcHBlci5pZCA9ICdiYXR0bGVzaGlwX2FwcCc7XG5cbiAgICAgIGFwcFdyYXBwZXIuYXBwZW5kQ2hpbGQoYnVpbGQuaGVhZGVyKCkpO1xuICAgICAgYXBwV3JhcHBlci5hcHBlbmRDaGlsZChidWlsZC5tYWluKCkpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhcHBXcmFwcGVyKTtcbiAgICB9LFxuICB9O1xuXG4gIGFwcC5pbml0KCk7XG59KSgpO1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcblxuZXhwb3J0IGRlZmF1bHQgKHBsYXllckJvYXJkKSA9PiB7XG4gIGNvbnN0IGJvYXJkID0ge1xuICAgIHJlbmRlcihib2FyZCkge1xuICAgICAgY29uc3QgcGxheWVyQm9hcmQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHBsYXllckJvYXJkLmNsYXNzTGlzdC5hZGQoJ2JvYXJkJyk7XG4gICAgICBib2FyZC5mb3JFYWNoKChyb3csIHkpID0+IHtcbiAgICAgICAgY29uc3QgYm9hcmRSb3cgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgYm9hcmRSb3cuY2xhc3NMaXN0LmFkZCgnYm9hcmRfcm93Jyk7XG4gICAgICAgIHJvdy5mb3JFYWNoKChjZWxsLCB4KSA9PiB7XG4gICAgICAgICAgY29uc3QgY2VsbEJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICAgIGNlbGxCdG4uc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICBjbGFzczogJ2NlbGwnLFxuICAgICAgICAgICAgWydkYXRhLXgnXTogeCArIDEsXG4gICAgICAgICAgICBbJ2RhdGEteSddOiByb3cubGVuZ3RoIC0geSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBOZWVkIHRvIHNob3cgb25seSBhY3RpdmVQbGF5ZXIncyBzaGlwc1xuICAgICAgICAgIC8vIE5lZWQgdG8gaGlkZSB0aGUgb3Bwb25lbnQncyBzaGlwcyB3aGVuIGFjdGl2ZVBsYXllciBjaGFuZ2VzXG4gICAgICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICBjb25zdCBibGFua1dyYXBwZXIgPSBjcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgYmxhbmtXcmFwcGVyLmNsYXNzTGlzdC5hZGQoJ2JsYW5rX3dyYXBwZXInKTtcbiAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChibGFua1dyYXBwZXIpO1xuICAgICAgICAgIGlmIChjZWxsLnNoaXApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNlbGwuc2hpcC5sZW5ndGgpO1xuICAgICAgICAgICAgLy8gUHJvYmxlbSwgYWxsb3dzIG9wcG9uZW50cyB0byBjaGVhdCBpbiBhIGJyb3dzZXIgZGV2ZWxvcGVyIHRvb2xzXG4gICAgICAgICAgICBjb25zdCBjZWxsU2hpcCA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgY2VsbFNoaXAuY2xhc3NMaXN0LmFkZCgnc2hpcCcpO1xuICAgICAgICAgICAgY2VsbENvbnRlbnQuYXBwZW5kQ2hpbGQoY2VsbFNoaXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjZWxsQ29udGVudC5jbGFzc0xpc3QuYWRkKCdjZWxsX2NvbnRlbnQnKTtcbiAgICAgICAgICBjZWxsQnRuLmFwcGVuZENoaWxkKGNlbGxDb250ZW50KTtcbiAgICAgICAgICAvLyBOZWVkIHRvIGNoZWNrIGZvciBsZWZ0IGFuZCB0b3AgZWRnZXMgb2YgYm9hcmRcbiAgICAgICAgICAvLyBUbyBjcmVhdGUgcm93IGFuZCBjb2x1bW4gbGFiZWxzXG4gICAgICAgICAgaWYgKHggPT09IDAgfHwgeSA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3Qgcm93TWFya2VyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBjb25zdCBjb2xNYXJrZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGlmICh4ID09PSAwKSB7XG4gICAgICAgICAgICAgIHJvd01hcmtlci5zZXRBdHRyaWJ1dGVzKHsgY2xhc3M6ICdyb3dfbWFya2VyJywgdGV4dENvbnRlbnQ6IGAke3kgKyAxfWAgfSk7XG4gICAgICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKHJvd01hcmtlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh5ID09PSAwKSB7XG4gICAgICAgICAgICAgIGNvbE1hcmtlci5zZXRBdHRyaWJ1dGVzKHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2NvbF9tYXJrZXInLFxuICAgICAgICAgICAgICAgIHRleHRDb250ZW50OiBgJHtTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgeCl9YCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKGNvbE1hcmtlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJvYXJkUm93LmFwcGVuZENoaWxkKGNlbGxCdG4pO1xuICAgICAgICAgIC8vIHBsYXllckJvYXJkLmFwcGVuZENoaWxkKGNlbGxCdG4pO1xuICAgICAgICB9KTtcbiAgICAgICAgcGxheWVyQm9hcmQuYXBwZW5kQ2hpbGQoYm9hcmRSb3cpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcGxheWVyQm9hcmQ7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gYm9hcmQucmVuZGVyKHBsYXllckJvYXJkKTtcbn07XG4iLCIiLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IGhlYWRlckNvbmZpZyBmcm9tICcuL2hlYWRlci5jb25maWcnO1xuaW1wb3J0IG5hdmJhciBmcm9tICcuL25hdmJhci9uYXZiYXInO1xuaW1wb3J0IG5vdGlmaWNhdGlvbnMgZnJvbSAnLi9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnMnO1xuaW1wb3J0ICcuLi8uLi9zdHlsZXMvaGVhZGVyLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgaGVhZGVyID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmhlYWRlciA9IGVsZW1lbnQ7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge30sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgaGVhZGVyRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoJ2hlYWRlcicpO1xuICAgICAgaGVhZGVyRWxlbWVudC5pZCA9ICdoZWFkZXInO1xuICAgICAgaGVhZGVyRWxlbWVudC5hcHBlbmRDaGlsZChuYXZiYXIoKSk7XG4gICAgICBoZWFkZXJFbGVtZW50LmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbnMoKSk7XG4gICAgICB0aGlzLmNhY2hlRE9NKGhlYWRlckVsZW1lbnQpO1xuXG4gICAgICByZXR1cm4gaGVhZGVyRWxlbWVudDtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBoZWFkZXIucmVuZGVyKCk7XG59O1xuIiwiaW1wb3J0IEljb25HaXRodWIgZnJvbSAnLi4vLi4vLi4vYXNzZXRzL2ljb25zL2dpdGh1Yl9tYXJrL2dpdGh1Yi1tYXJrLXdoaXRlLnN2Zyc7XG5cbmV4cG9ydCBkZWZhdWx0IFtcbiAge1xuICAgIGVsZW1lbnQ6ICd1bCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgY2xhc3M6ICduYXZfbGVmdCcsXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJyMnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtIG5hdl9sb2dvJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2ltZycsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgc3JjOiAnIycsXG4gICAgICAgICAgICAgICAgICAvLyBvbmxvYWQ6ICdTVkdJbmplY3QodGhpcyknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnaDEnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50OiAnQmF0dGxlc2hpcCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbiAge1xuICAgIGVsZW1lbnQ6ICd1bCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgY2xhc3M6ICduYXZfcmlnaHQnLFxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICcjJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbScsXG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnUGxhY2Vob2xkZXInLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICcjJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbScsXG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnUGxhY2Vob2xkZXInLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vbWlrZXlDb3MvYmF0dGxlc2hpcC90cmVlL21haW4nLFxuICAgICAgICAgICAgICB0YXJnZXQ6ICdfYmxhbmsnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtIGdpdGh1YicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdpbWcnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzOiAnZ2l0aHViX2xvZ28nLFxuICAgICAgICAgICAgICAgICAgc3JjOiBJY29uR2l0aHViLFxuICAgICAgICAgICAgICAgICAgb25sb2FkOiAnU1ZHSW5qZWN0KHRoaXMpJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgdGFyZ2V0OiAnX3NlbGYnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtIGxlYXZlX2dhbWUgaW5hY3RpdmUnLFxuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ0xlYXZlIGdhbWUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuXTtcbiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgbmF2YmFyQ29uZmlnIGZyb20gJy4vbmF2YmFyLmNvbmZpZyc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCAnLi4vLi4vLi4vc3R5bGVzL25hdmJhci5jc3MnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIGNvbnN0IG5hdmJhciA9IHtcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy5yZXZlYWxMZWF2ZSA9IHRoaXMucmV2ZWFsTGVhdmUuYmluZCh0aGlzKTtcbiAgICB9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMubmF2YmFyID0gZWxlbWVudDtcbiAgICAgIHRoaXMubmF2TGVhdmUgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5uYXZfaXRlbS5sZWF2ZV9nYW1lJyk7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgcHViU3ViLnN1YnNjcmliZSgncmV2ZWFsTGVhdmUnLCB0aGlzLnJldmVhbExlYXZlKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IG5hdkVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KCduYXYnKTtcbiAgICAgIG5hdkVsZW1lbnQuaWQgPSAnbmF2YmFyJztcblxuICAgICAgbmF2YmFyQ29uZmlnLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3QgbmF2Q2hpbGQgPSBjcmVhdGVFbGVtZW50KGl0ZW0uZWxlbWVudCk7XG4gICAgICAgIG5hdkNoaWxkLnNldEF0dHJpYnV0ZXMoaXRlbS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgbmF2Q2hpbGQuc2V0Q2hpbGRyZW4oaXRlbS5jaGlsZHJlbik7XG4gICAgICAgIG5hdkVsZW1lbnQuYXBwZW5kQ2hpbGQobmF2Q2hpbGQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuY2FjaGVET00obmF2RWxlbWVudCk7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIHJldHVybiBuYXZFbGVtZW50O1xuICAgIH0sXG4gICAgcmV2ZWFsTGVhdmUoZSkge1xuICAgICAgdGhpcy5uYXZMZWF2ZS5jbGFzc0xpc3QucmVtb3ZlKCdpbmFjdGl2ZScpO1xuICAgIH0sXG4gIH07XG5cbiAgbmF2YmFyLmluaXQoKTtcbiAgcmV0dXJuIG5hdmJhci5yZW5kZXIoKTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGVsZW1lbnQ6ICdkaXYnLFxuICBhdHRyaWJ1dGVzOiB7XG4gICAgY2xhc3M6ICdub3RpZmljYXRpb25fbWVzc2FnZScsXG4gIH0sXG4gIG9wdGlvbnM6IFtcbiAgICB7XG4gICAgICB0eXBlOiAnZGVmYXVsdCcsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIHRleHRDb250ZW50OiAnUGljayBnYW1lIG1vZGUnLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6ICdwbGFjZScsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIHRleHRDb250ZW50OiAnUGxhY2Ugc2hpcHMnLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6ICd0dXJuJyxcbiAgICAgIGNyZWF0ZUF0dHJpYnV0ZXModGV4dCkge1xuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0ZXh0O1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSB7IHRleHRDb250ZW50OiBgUGxheWVyICR7cGxheWVyfSdzIHR1cm4uYCB9O1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6ICdnYW1lb3ZlcicsXG4gICAgICBjcmVhdGVBdHRyaWJ1dGVzKHRleHQpIHtcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGV4dDtcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0geyB0ZXh0Q29udGVudDogYEdhbWUgb3Zlci4gQ29uZ3JhdHVsYXRpb25zLCBwbGF5ZXIgJHtwbGF5ZXJ9IHdvbiFgIH07XG4gICAgICB9LFxuICAgICAgc2libGluZzogW1xuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGhyZWY6ICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgIHRhcmdldDogJ19zZWxmJyxcbiAgICAgICAgICAgIGNsYXNzOiAncGxheV9hZ2FpbicsXG4gICAgICAgICAgICB0ZXh0Q29udGVudDogJ1BsYXkgQWdhaW4nLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIF0sXG59O1xuXG5leHBvcnQgY29uc3QgY29udGFpbmVyID0ge1xuICBlbGVtZW50OiAnZGl2JyxcbiAgYXR0cmlidXRlczoge1xuICAgIGlkOiAnbm90aWZpY2F0aW9uc19jb250YWluZXInLFxuICB9LFxuICBjaGlsZHJlbjogW1xuICAgIHtcbiAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICBjbGFzczogJ25vdGlmaWNhdGlvbl93cmFwcGVyJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbn07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgbm90aWZpY2F0aW9uc0NvbmZpZywgeyBjb250YWluZXIgfSBmcm9tICcuL25vdGlmaWNhdGlvbnMuY29uZmlnJztcbmltcG9ydCAnLi4vLi4vLi4vc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBub3RpZmljYXRpb25zID0ge1xuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLnJlbmRlciA9IHRoaXMucmVuZGVyLmJpbmQodGhpcyk7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLm5vdGlmaWNhdGlvbkNvbnRhaW5lciA9IGVsZW1lbnQ7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgcHViU3ViLnN1YnNjcmliZSgnbm90aWZ5JywgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgcmVuZGVyKHR5cGUsIHBsYXllcikge1xuICAgICAgY29uc29sZS5sb2codHlwZSk7XG4gICAgICBjb25zb2xlLmxvZyhwbGF5ZXIpO1xuICAgICAgY29uc3QgbWVzc2FnZVR5cGUgPSB0eXBlID8gdHlwZSA6ICdkZWZhdWx0JztcbiAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbkNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoY29udGFpbmVyLmVsZW1lbnQpO1xuICAgICAgbm90aWZpY2F0aW9uQ29udGFpbmVyLnNldEF0dHJpYnV0ZXMoY29udGFpbmVyLmF0dHJpYnV0ZXMpO1xuICAgICAgbm90aWZpY2F0aW9uQ29udGFpbmVyLnNldENoaWxkcmVuKGNvbnRhaW5lci5jaGlsZHJlbik7XG4gICAgICBjb25zdCBub3RpZmljYXRpb25XcmFwcGVyID0gbm90aWZpY2F0aW9uQ29udGFpbmVyLmZpcnN0Q2hpbGQ7XG5cbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBub3RpZmljYXRpb25zQ29uZmlnLm9wdGlvbnMuZmluZCgobWVzc2FnZSkgPT4gbWVzc2FnZS50eXBlID09PSBtZXNzYWdlVHlwZSk7XG4gICAgICBpZiAocGxheWVyKSB7XG4gICAgICAgIG1lc3NhZ2UuY3JlYXRlQXR0cmlidXRlcyhwbGF5ZXIpO1xuICAgICAgfVxuICAgICAgY29uc3Qgbm90aWZpY2F0aW9uTWVzc2FnZSA9IGNyZWF0ZUVsZW1lbnQobm90aWZpY2F0aW9uc0NvbmZpZy5lbGVtZW50KTtcbiAgICAgIG5vdGlmaWNhdGlvbk1lc3NhZ2Uuc2V0QXR0cmlidXRlcyh7XG4gICAgICAgIC4uLm5vdGlmaWNhdGlvbnNDb25maWcuYXR0cmlidXRlcyxcbiAgICAgICAgLi4ubWVzc2FnZS5hdHRyaWJ1dGVzLFxuICAgICAgfSk7XG4gICAgICBub3RpZmljYXRpb25Db250YWluZXIuY2xhc3NMaXN0LmFkZChtZXNzYWdlLnR5cGUpO1xuICAgICAgbm90aWZpY2F0aW9uV3JhcHBlci5hcHBlbmRDaGlsZChub3RpZmljYXRpb25NZXNzYWdlKTtcblxuICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgdGhpcy5ub3RpZmljYXRpb25Db250YWluZXIucmVwbGFjZVdpdGgobm90aWZpY2F0aW9uQ29udGFpbmVyKTtcbiAgICAgICAgaWYgKG1lc3NhZ2Uuc2libGluZykgbm90aWZpY2F0aW9uV3JhcHBlci5zZXRDaGlsZHJlbihtZXNzYWdlLnNpYmxpbmcpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNhY2hlRE9NKG5vdGlmaWNhdGlvbkNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIGlmICghcGxheWVyKSByZXR1cm4gbm90aWZpY2F0aW9uQ29udGFpbmVyO1xuICAgIH0sXG4gIH07XG5cbiAgbm90aWZpY2F0aW9ucy5pbml0KCk7XG4gIHJldHVybiBub3RpZmljYXRpb25zLnJlbmRlcigpO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IFtcbiAge1xuICAgIGVsZW1lbnQ6ICdzZWN0aW9uJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICBjbGFzczogJ2dhbWVtb2RlX2J0bnMnLFxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICBjbGFzczogJ2dhbWVtb2RlX2J0biBodW1hbl9odW1hbicsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ2h1bWFuIHZzIGh1bWFuJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdidXR0b24nLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgY2xhc3M6ICdnYW1lbW9kZV9idG4gaHVtYW5fY29tcHV0ZXInLFxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdodW1hbiB2cyBjb21wdXRlcicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG5dO1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBob21lQ29uZmlnIGZyb20gJy4vaG9tZS5jb25maWcnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9ob21lLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgaG9tZSA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5ob21lID0gZWxlbWVudDtcbiAgICAgIHRoaXMuaGVhZGVyID0gdGhpcy5ob21lLnF1ZXJ5U2VsZWN0b3IoJ2gyJyk7XG4gICAgICB0aGlzLm1vZGVCdG5zID0gdGhpcy5ob21lLnF1ZXJ5U2VsZWN0b3JBbGwoJy5nYW1lbW9kZV9idG4nKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuaG9tZSk7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLm1vZGVCdG5zKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICB0aGlzLnNldEdhbWVNb2RlID0gdGhpcy5zZXRHYW1lTW9kZS5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5tb2RlQnRucy5mb3JFYWNoKChidG4pID0+IGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuc2V0R2FtZU1vZGUpKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGhvbWVDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGhvbWVDb250YWluZXIuaWQgPSAnaG9tZSc7XG5cbiAgICAgIGhvbWVDb25maWcuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCBob21lQ2hpbGQgPSBjcmVhdGVFbGVtZW50KGl0ZW0uZWxlbWVudCk7XG4gICAgICAgIGlmIChpdGVtLmF0dHJpYnV0ZXMpIGhvbWVDaGlsZC5zZXRBdHRyaWJ1dGVzKGl0ZW0uYXR0cmlidXRlcyk7XG4gICAgICAgIGlmIChpdGVtLmNoaWxkcmVuKSBob21lQ2hpbGQuc2V0Q2hpbGRyZW4oaXRlbS5jaGlsZHJlbik7XG4gICAgICAgIGhvbWVDb250YWluZXIuYXBwZW5kQ2hpbGQoaG9tZUNoaWxkKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmNhY2hlRE9NKGhvbWVDb250YWluZXIpO1xuICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG4gICAgICByZXR1cm4gaG9tZUNvbnRhaW5lcjtcbiAgICB9LFxuICAgIHNldEdhbWVNb2RlKGUpIHtcbiAgICAgIGNvbnN0IGdhbWVtb2RlID0gIWUuY3VycmVudFRhcmdldC5jbGFzc0xpc3QudmFsdWUuaW5jbHVkZXMoJ2NvbXB1dGVyJyk7XG4gICAgICBjb25zb2xlLmxvZyhnYW1lbW9kZSk7XG4gICAgICBwdWJTdWIucHVibGlzaCgnbWFpbl9yZW5kZXInLCBnYW1lbW9kZSk7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gaG9tZS5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHNjcmVlbkNvbnRyb2xsZXIgZnJvbSAnLi4vc2NyZWVuL3NjcmVlbkNvbnRyb2xsZXInO1xuaW1wb3J0IGJ1aWxkSG9tZSBmcm9tICcuLi9ob21lL2hvbWUnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgYnVpbGQgPSB7XG4gICAgaG9tZTogYnVpbGRIb21lLFxuICAgIGdhbWU6IHNjcmVlbkNvbnRyb2xsZXIsXG4gIH07XG4gIGNvbnN0IG1haW4gPSB7XG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKTtcbiAgICB9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMubWFpbiA9IGVsZW1lbnQ7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLm1haW4pO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ21haW5fcmVuZGVyJywgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgcmVuZGVyKG1vZGUpIHtcbiAgICAgIGlmIChtb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgbWFpbkNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBtYWluQ29udGFpbmVyLmlkID0gJ21haW5fY29udGVudCc7XG4gICAgICAgIG1haW5Db250YWluZXIuYXBwZW5kQ2hpbGQoYnVpbGQuaG9tZSgpKTtcbiAgICAgICAgdGhpcy5jYWNoZURPTShtYWluQ29udGFpbmVyKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG4gICAgICAgIHJldHVybiBtYWluQ29udGFpbmVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tYWluLmZpcnN0RWxlbWVudENoaWxkLnJlcGxhY2VXaXRoKGJ1aWxkLmdhbWUobW9kZSkpO1xuICAgICAgICBwdWJTdWIucHVibGlzaCgncmV2ZWFsTGVhdmUnKTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xuXG4gIG1haW4uaW5pdCgpO1xuICByZXR1cm4gbWFpbi5yZW5kZXIoKTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGVsZW1lbnQ6ICdkaXYnLFxuICBhdHRyaWJ1dGVzOiB7XG4gICAgY2xhc3M6ICdwb3J0JyxcbiAgfSxcbiAgY2hpbGRyZW46IFtcbiAgICB7XG4gICAgICBlbGVtZW50OiAncCcsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIHRleHRDb250ZW50OiAnRHJhZyB0aGUgc2hpcHMgdG8gdGhlIGdyaWQsIGFuZCB0aGVuIGNsaWNrIHRvIHJvdGF0ZTonLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICBjbGFzczogJ3BvcnRfbGluZXMnLFxuICAgICAgfSxcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA4ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICc0JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDhlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgIH0sXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMycsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICczJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDZlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgIH0sXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcyJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDRlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDRlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1sZW5ndGgnXTogJzInLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICBjbGFzczogJ3BvcnRfbGluZXMnLFxuICAgICAgfSxcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1sZW5ndGgnXTogJzEnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAvLyBkcmFnZ2FibGU6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdidG5zX2NvbnRhaW5lcicsXG4gICAgICB9LFxuICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncmVzZXQnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3Jlc2V0X2J0biBpbmFjdGl2ZScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1Jlc2V0JyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncmFuZG9tJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdidXR0b24nLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdyYW5kb21fYnRuJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50OiAnUmFuZG9taXplJyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncmVhZHknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3JlYWR5X2J0biBpbmFjdGl2ZScsXG4gICAgICAgICAgICAgICAgWydkYXRhLXJlYWR5J106IGZhbHNlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJyxcbiAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdSZWFkeScsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIF0sXG59O1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBwb3J0Q29uZmlnIGZyb20gJy4vcG9ydC5jb25maWcnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgYm9hcmQgZnJvbSAnLi4vYm9hcmQvYm9hcmQnO1xuXG5leHBvcnQgZGVmYXVsdCAocGxheWVyLCBnYW1lLCBtb2RlKSA9PiB7XG4gIGNvbnN0IHBvcnQgPSB7XG4gICAgLy8gUmVuYW1lIHRvIHBvcnRDb250cm9sbGVyIG9yIHNoaXBzQ29udHJvbGxlcj9cbiAgICBwbGF5ZXIsXG4gICAgZ2FtZSxcbiAgICBtb2RlLFxuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLmRyYWdTdGFydEhhbmRsZXIgPSB0aGlzLmRyYWdTdGFydEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuZHJhZ0VuZEhhbmRsZXIgPSB0aGlzLmRyYWdFbmRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmRyYWdNb3ZlSGFuZGxlciA9IHRoaXMuZHJhZ01vdmVIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmRyb3BIYW5kbGVyID0gdGhpcy5kcm9wSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5yb3RhdGVIYW5kbGVyID0gdGhpcy5yb3RhdGVIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmRyYWdTdGFydEhhbmRsZXIgPSB0aGlzLmRyYWdTdGFydEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMucmVzZXRIYW5kbGVyID0gdGhpcy5yZXNldEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMucmVhZHlIYW5kbGVyID0gdGhpcy5yZWFkeUhhbmRsZXIuYmluZCh0aGlzKTtcblxuICAgICAgdGhpcy5wbGF5ZXJCb2FyZCA9XG4gICAgICAgIHBsYXllciA9PT0gJ3BsYXllcl9vbmUnID8gdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkIDogdGhpcy5nYW1lLnBsYXllclR3b0JvYXJkO1xuICAgICAgdGhpcy5kcm9wU3Vic2NyaWJlciA9IGBkcm9wJHtwbGF5ZXIuc3Vic3RyaW5nKHBsYXllci5pbmRleE9mKCdfJykpfWA7XG4gICAgICB0aGlzLnJvdGF0ZVN1YnNjcmliZXIgPSBgcm90YXRlJHtwbGF5ZXIuc3Vic3RyaW5nKHBsYXllci5pbmRleE9mKCdfJykpfWA7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLnBvcnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5wb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBvcnRfc2hpcCcpO1xuICAgICAgdGhpcy5zaGlwcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNoaXBfYm94Jyk7XG4gICAgICB0aGlzLnJlc2V0QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVzZXRfYnRuJyk7XG4gICAgICB0aGlzLnJlYWR5QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVhZHlfYnRuJyk7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgdGhpcy5zaGlwcy5mb3JFYWNoKChzaGlwKSA9PiB7XG4gICAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQwNDY0NjkwL3dhbnQtdG8tcGVyZm9ybS1kaWZmZXJlbnQtdGFzay1vbi1tb3VzZWRvd24tYW5kLWNsaWNrLWV2ZW50XG4gICAgICAgIHNoaXAuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5kcmFnU3RhcnRIYW5kbGVyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyB0aGlzLnJlYWR5RXZlbnQgPSBuZXcgRXZlbnQoJ2NsaWNrJyk7XG4gICAgICB0aGlzLnJlc2V0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5yZXNldEhhbmRsZXIpO1xuICAgICAgdGhpcy5yZWFkeUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucmVhZHlIYW5kbGVyKTtcbiAgICAgIHB1YlN1Yi5zdWJzY3JpYmUodGhpcy5kcm9wU3Vic2NyaWJlciwgdGhpcy5kcm9wSGFuZGxlcik7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKHRoaXMucm90YXRlU3Vic2NyaWJlciwgdGhpcy5yb3RhdGVIYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IHBsYXllclBvcnQgPSBjcmVhdGVFbGVtZW50KHBvcnRDb25maWcuZWxlbWVudCk7XG4gICAgICBwbGF5ZXJQb3J0LnNldEF0dHJpYnV0ZXMocG9ydENvbmZpZy5hdHRyaWJ1dGVzKTtcbiAgICAgIHBsYXllclBvcnQuc2V0Q2hpbGRyZW4ocG9ydENvbmZpZy5jaGlsZHJlbik7XG4gICAgICB0aGlzLmNhY2hlRE9NKHBsYXllclBvcnQpO1xuICAgICAgaWYgKCF0aGlzLm1vZGUpIHRoaXMucmVhZHlCdG4uY2xhc3NMaXN0LmFkZCgnaW5hY3RpdmUnKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgcmV0dXJuIHBsYXllclBvcnQ7XG4gICAgfSxcbiAgICBkcmFnU3RhcnRIYW5kbGVyKGUpIHtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlID0gZS5jdXJyZW50VGFyZ2V0O1xuICAgICAgdGhpcy5kcmFnU3RhcnQgPSBlLnRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgICAgdGhpcy5kcm9wUGxhY2Vob2xkZXIgPSB0aGlzLmRyYWdnYWJsZS5jbG9uZU5vZGUoKTtcbiAgICAgIHRoaXMuZHJvcFBsYWNlaG9sZGVyLmNsYXNzTGlzdC5hZGQoJ3NoaXBfYm94X3BsYWNlaG9sZGVyJyk7XG4gICAgICB0aGlzLm9mZlNldFggPSBlLmNsaWVudFg7XG4gICAgICB0aGlzLm9mZlNldFkgPSBlLmNsaWVudFk7XG5cbiAgICAgIHRoaXMuZHJhZ1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuZHJhZ01vdmVIYW5kbGVyKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucm90YXRlSGFuZGxlcik7XG4gICAgICB9LCAyNTApO1xuXG4gICAgICB0aGlzLmRyYWdnYWJsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucm90YXRlSGFuZGxlciwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH0sXG4gICAgZHJhZ01vdmVIYW5kbGVyKGUpIHtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5hZGQoJ2RyYWdnaW5nJyk7XG4gICAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QuYWRkKCdkcmFnc3RhcnQnKTtcblxuICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAke2UuY2xpZW50WCAtIHRoaXMub2ZmU2V0WH1weGA7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgJHtlLmNsaWVudFkgLSB0aGlzLm9mZlNldFl9cHhgO1xuXG4gICAgICBjb25zdCB7IGxlZnQsIHRvcCwgd2lkdGggfSA9IHRoaXMuZHJhZ2dhYmxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3Qgc2hpcExlbmd0aCA9IHBhcnNlSW50KHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQubGVuZ3RoKTtcbiAgICAgIGNvbnN0IG9mZlNldCA9ICh3aWR0aCAvIHNoaXBMZW5ndGgpICogMC41O1xuXG4gICAgICBjb25zdCBjZWxsID0gZG9jdW1lbnRcbiAgICAgICAgLmVsZW1lbnRzRnJvbVBvaW50KGxlZnQgKyBvZmZTZXQsIHRvcCArIG9mZlNldClcbiAgICAgICAgLmZpbmQoKGVsZW1lbnQpID0+IGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjZWxsJykpO1xuXG4gICAgICBjb25zdCBib2FyZCA9IGRvY3VtZW50XG4gICAgICAgIC5lbGVtZW50c0Zyb21Qb2ludChsZWZ0ICsgb2ZmU2V0LCB0b3AgKyBvZmZTZXQpXG4gICAgICAgIC5maW5kKChlbGVtZW50KSA9PiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnYm9hcmQnKSk7XG4gICAgICBjb25zdCBpc1BsYXllclNoaXAgPSBib2FyZCA/IGJvYXJkLnBhcmVudEVsZW1lbnQuY29udGFpbnModGhpcy5wb3J0KSA6IGZhbHNlO1xuICAgICAgaWYgKGNlbGwgJiYgaXNQbGF5ZXJTaGlwKSB7XG4gICAgICAgIC8vIERyYWdnaW5nIG92ZXIgZHJvcCB6b25lXG4gICAgICAgIC8vIElmIGRyYWdnYWJsZSBpcyBtb3JlIHRoYW4gNTAlIG92ZXIgaXQncyAnbGFzdCcgY2VsbFxuICAgICAgICAvLyAgQXBwZW5kIHRoZSBkcmFnZ2FibGUgdG8gdGhlIGNlbGwgY29udGVudCBjb250YWluZXJcbiAgICAgICAgdGhpcy5jZWxsID0gY2VsbDtcbiAgICAgICAgY29uc3QgeCA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LngpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueSk7XG5cbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQub3JpZW50YXRpb24gIT09ICdoJztcbiAgICAgICAgLy8gdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCB0cnVlLCBmYWxzZSwgaWQpO1xuICAgICAgICB0aGlzLnBsYXllckJvYXJkLnBsYWNlU2hpcChcbiAgICAgICAgICBbeCwgeV0sXG4gICAgICAgICAgc2hpcExlbmd0aCxcbiAgICAgICAgICBvcmllbnRhdGlvbixcbiAgICAgICAgICB0cnVlLFxuICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgIGlkLFxuICAgICAgICAgIHRoaXMuZHJvcFN1YnNjcmliZXIsXG4gICAgICAgICAgdGhpcy5yb3RhdGVTdWJzY3JpYmVyLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRHJhZ2dpbmcgb3ZlciBhIG5vbiBkcm9wIHpvbmVcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5jb250YWlucygnc2hpcF9ib3hfdHJhbnNwYXJlbnQnKSAmJlxuICAgICAgICAgIHRoaXMuY2VsbC5maXJzdENoaWxkLmxhc3RDaGlsZFxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLmNlbGwuZmlyc3RDaGlsZC5sYXN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5jZWxsID0gbnVsbDtcbiAgICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QucmVtb3ZlKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkcmFnRW5kSGFuZGxlcihlKSB7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5sZWZ0ID0gYDBweGA7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgMHB4YDtcblxuICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZ2dpbmcnKTtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnc3RhcnQnKTtcblxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5kcmFnTW92ZUhhbmRsZXIpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICAgICAgaWYgKHRoaXMuY2VsbCkge1xuICAgICAgICAvLyBJZiB1c2VyIGhhcyBzdG9wcGVkIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh0aGlzLmNlbGwuZGF0YXNldC55KTtcbiAgICAgICAgY29uc3Qgc2hpcExlbmd0aCA9IHBhcnNlSW50KHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQub3JpZW50YXRpb24gIT09ICdoJztcbiAgICAgICAgLy8gdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCBmYWxzZSwgZmFsc2UsIGlkKTtcbiAgICAgICAgdGhpcy5wbGF5ZXJCb2FyZC5wbGFjZVNoaXAoXG4gICAgICAgICAgW3gsIHldLFxuICAgICAgICAgIHNoaXBMZW5ndGgsXG4gICAgICAgICAgb3JpZW50YXRpb24sXG4gICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgaWQsXG4gICAgICAgICAgdGhpcy5kcm9wU3Vic2NyaWJlcixcbiAgICAgICAgICB0aGlzLnJvdGF0ZVN1YnNjcmliZXIsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5kcmFnU3RhcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdwb3J0X3NoaXAnKSAmJiB0aGlzLmRyYWdnYWJsZSkge1xuICAgICAgICAvLyBJZiBkcmFnU3RhcnQgaXMgbm90IHRoZSBwb3J0X3NoaXAgZWxlbWVudFxuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5sZWZ0ID0gYC00JWA7XG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAtNCVgO1xuICAgICAgfVxuICAgIH0sXG4gICAgZHJvcEhhbmRsZXIoaXNEcmFnZ2luZywgaXNWYWxpZERyb3ApIHtcbiAgICAgIGlmICh0aGlzLmNlbGwpIHtcbiAgICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSB0aGlzLmNlbGwuZmlyc3RDaGlsZDtcbiAgICAgICAgaWYgKGlzRHJhZ2dpbmcgJiYgaXNWYWxpZERyb3ApIHtcbiAgICAgICAgICAvLyBJZiB1c2VyIGlzIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKHRoaXMuZHJvcFBsYWNlaG9sZGVyKTtcbiAgICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QuYWRkKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0RyYWdnaW5nICYmIGlzVmFsaWREcm9wKSB7XG4gICAgICAgICAgLy8gSWYgdXNlciBoYXMgc3RvcHBlZCBkcmFnZ2luZyBvdmVyIHRoZSBkcm9wIHpvbmVcbiAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZCh0aGlzLmRyYWdnYWJsZSk7XG4gICAgICAgICAgdGhpcy5kcm9wUGxhY2Vob2xkZXIucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAtNCVgO1xuICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAtNCVgO1xuICAgICAgICAgIGlmICh0aGlzLnJlc2V0QnRuLmNsYXNzTGlzdC5jb250YWlucygnaW5hY3RpdmUnKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpbmFjdGl2ZScpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0aGlzLmlzUG9ydHNFbXB0eSgpICYmICF0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICAgICAgdGhpcy5nYW1lUmVhZHkgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5yZWFkeUJ0bi5jbGljaygpO1xuICAgICAgICAgICAgaWYgKHRoaXMubW9kZSkgdGhpcy5yZWFkeUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpbmFjdGl2ZScpO1xuICAgICAgICAgICAgWy4uLnRoaXMucG9ydC5jaGlsZHJlbl0uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFjaGlsZC5jbGFzc0xpc3QuY29udGFpbnMoJ2J0bnNfY29udGFpbmVyJykpIHtcbiAgICAgICAgICAgICAgICBjaGlsZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEcmFnZ2luZyAmJiAhaXNWYWxpZERyb3ApIHtcbiAgICAgICAgICAvLyBJZiB1c2VyIGlzIGRyYWdnaW5nIG92ZXIgYW4gaW52YWxpZCBkcm9wXG4gICAgICAgICAgaWYgKHRoaXMuZHJvcFBsYWNlaG9sZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRyb3BQbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICByb3RhdGVIYW5kbGVyKGUpIHtcbiAgICAgIGNvbnN0IG5ld09yaWVudGF0aW9uID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5vcmllbnRhdGlvbiA9PT0gJ2gnO1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNb3VzZUV2ZW50KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRyYWdUaW1lcik7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAhdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkcmFnZ2luZycpICYmXG4gICAgICAgICAgIXRoaXMuZHJhZ1N0YXJ0LmNsYXNzTGlzdC5jb250YWlucygncG9ydF9zaGlwJylcbiAgICAgICAgKSB7XG4gICAgICAgICAgLy8gSWYgc2hpcCBpcyBub3QgYmVpbmcgZHJhZ2dlZCBhbmQgaXQgaXMgbm90IGluIHBvcnRcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5jZWxsID0gdGhpcy5kcmFnU3RhcnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LnkpO1xuICAgICAgICAgIGNvbnN0IHNoaXBMZW5ndGggPSBwYXJzZUludCh0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lmxlbmd0aCk7XG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICAgIC8vIHRoaXMuZ2FtZS5wbGF5ZXJPbmVCb2FyZC5wbGFjZVNoaXAoW3gsIHldLCBzaGlwTGVuZ3RoLCBuZXdPcmllbnRhdGlvbiwgZmFsc2UsIHRydWUsIGlkKTtcbiAgICAgICAgICB0aGlzLnBsYXllckJvYXJkLnBsYWNlU2hpcChcbiAgICAgICAgICAgIFt4LCB5XSxcbiAgICAgICAgICAgIHNoaXBMZW5ndGgsXG4gICAgICAgICAgICBuZXdPcmllbnRhdGlvbixcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgdGhpcy5kcm9wU3Vic2NyaWJlcixcbiAgICAgICAgICAgIHRoaXMucm90YXRlU3Vic2NyaWJlcixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICB9IGVsc2UgaWYgKGUgPT09IHRydWUgJiYgcGFyc2VJbnQodGhpcy5kcmFnZ2FibGUuZGF0YXNldC5sZW5ndGgpID4gMSkge1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lm9yaWVudGF0aW9uID0gbmV3T3JpZW50YXRpb24gPyAndicgOiAnaCc7XG4gICAgICAgIGNvbnN0IG5ld1dpZHRoID0gbmV3T3JpZW50YXRpb24gPyB0aGlzLmRyYWdnYWJsZS5zdHlsZS53aWR0aCA6IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmhlaWdodDtcbiAgICAgICAgY29uc3QgbmV3SGVpZ2h0ID0gbmV3T3JpZW50YXRpb24gPyB0aGlzLmRyYWdnYWJsZS5zdHlsZS5oZWlnaHQgOiB0aGlzLmRyYWdnYWJsZS5zdHlsZS53aWR0aDtcbiAgICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUud2lkdGggPSBuZXdPcmllbnRhdGlvbiA/IG5ld0hlaWdodCA6IG5ld1dpZHRoO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5oZWlnaHQgPSBuZXdPcmllbnRhdGlvbiA/IG5ld1dpZHRoIDogbmV3SGVpZ2h0O1xuICAgICAgfSBlbHNlIGlmIChlID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QuYWRkKCdyb3RhdGVfZXJyb3InKTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QucmVtb3ZlKCdyb3RhdGVfZXJyb3InKTtcbiAgICAgICAgfSwgMjUwKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlc2V0SGFuZGxlcihlKSB7XG4gICAgICAvLyBDbGVhcnMgYm9hcmRcbiAgICAgIHRoaXMuZ2FtZVJlYWR5ID0gZmFsc2U7XG4gICAgICBjb25zdCBwbGF5ZXJCb2FyZCA9IHRoaXMucmVzZXRCdG4uY2xvc2VzdChcbiAgICAgICAgdGhpcy5yZXNldEJ0bi5jbG9zZXN0KCcucGxheWVyX29uZScpID8gJy5wbGF5ZXJfb25lJyA6ICcucGxheWVyX3R3bycsXG4gICAgICApLmZpcnN0Q2hpbGQ7XG5cbiAgICAgIHRoaXMucGxheWVyQm9hcmQuY2xlYXJCb2FyZCgpO1xuICAgICAgdGhpcy5wb3J0LnJlcGxhY2VXaXRoKHRoaXMucmVuZGVyKCkpO1xuICAgICAgcGxheWVyQm9hcmQucmVwbGFjZVdpdGgoYm9hcmQodGhpcy5wbGF5ZXJCb2FyZC5ib2FyZCkpO1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ3BsYXllclJlYWR5JywgdGhpcy5wbGF5ZXIpO1xuICAgIH0sXG4gICAgaXNQb3J0c0VtcHR5KCkge1xuICAgICAgcmV0dXJuIFsuLi50aGlzLnBvcnRzXS5ldmVyeSgocG9ydCkgPT4gcG9ydC5maXJzdENoaWxkID09PSBudWxsKTtcbiAgICB9LFxuICAgIHJlYWR5SGFuZGxlcihlKSB7XG4gICAgICBjb25zdCBpc1JlYWR5ID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQucmVhZHkgIT09ICd0cnVlJztcbiAgICAgIGUuY3VycmVudFRhcmdldC50ZXh0Q29udGVudCA9IGlzUmVhZHkgPyAnVW5yZWFkeScgOiAnUmVhZHknO1xuICAgICAgZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQucmVhZHkgPSBpc1JlYWR5O1xuICAgICAgaWYgKHRoaXMubW9kZSkgdGhpcy5oaWRlU2hpcHMoaXNSZWFkeSk7XG4gICAgICBwdWJTdWIucHVibGlzaCgncGxheWVyUmVhZHknLCB0aGlzLnBsYXllciwgaXNSZWFkeSk7XG4gICAgfSxcbiAgICBoaWRlU2hpcHMoaXNSZWFkeSkge1xuICAgICAgdGhpcy5zaGlwcy5mb3JFYWNoKChzaGlwKSA9PiB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXkgPSBpc1JlYWR5ID8gJ25vbmUnIDogJ2Jsb2NrJztcbiAgICAgICAgc2hpcC5zdHlsZS5kaXNwbGF5ID0gZGlzcGxheTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH07XG5cbiAgcG9ydC5pbml0KCk7XG4gIHJldHVybiBwb3J0LnJlbmRlcigpO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IChzdGF0ZSkgPT4gKHtcbiAgcGxheWVyc1JlYWR5OiBbXSxcbiAgaW5pdCgpIHtcbiAgICBjb25zb2xlLmxvZygnaW5pdCBydW5uaW5nIGZyb20gY29tcG9zZUdhbWUnKTtcbiAgfSxcbiAgaXNHYW1lUmVhZHkocGxheWVyLCBpc1JlYWR5KSB7XG4gICAgaWYgKHRoaXMubW9kZSkge1xuICAgICAgLy8gSWYgaHVtYW4gdnMgaHVtYW5cbiAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5wbGF5ZXJzUmVhZHkuaW5kZXhPZihwbGF5ZXIpO1xuICAgICAgaWYgKHBsYXllciAmJiBpc1JlYWR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGlzUmVhZHkpIHtcbiAgICAgICAgICB0aGlzLnBsYXllcnNSZWFkeS5wdXNoKHBsYXllcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5wbGF5ZXJzUmVhZHkuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIHRoaXMucGxheWVyc1JlYWR5LnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnBsYXllcnNSZWFkeS5sZW5ndGggPT09IDIgJiYgdGhpcy5wbGF5QnRuLmNsYXNzTGlzdC5jb250YWlucygnaW5hY3RpdmUnKSkge1xuICAgICAgICB0aGlzLnBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaW5hY3RpdmUnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpbmFjdGl2ZScpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5wbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbmFjdGl2ZScpKSB7XG4gICAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2luYWN0aXZlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdpbmFjdGl2ZScpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcGxheShlKSB7XG4gICAgaWYgKCF0aGlzLm1vZGUpIHtcbiAgICAgIHRoaXMuZ2FtZS5wbGF5ZXJUd28uYm9hcmQucGxhY2VTaGlwc1JhbmRvbSgpO1xuICAgIH1cbiAgICB0aGlzLmdhbWVSZWFkeSA9IHRydWU7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgICB0aGlzLnJlbmRlcldhaXQoKTtcbiAgfSxcbn0pO1xuIiwiaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5cbmV4cG9ydCBkZWZhdWx0IChzdGF0ZSkgPT4gKHtcbiAgaW5pdCgpIHt9LFxuICB1bmJpbmRFdmVudHMoKSB7XG4gICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICB0aGlzLnBsYXllclR3b0JvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICB9LFxuICBnZXRCdXR0b24oW3gsIHldKSB7XG4gICAgLy8gRmluZCBidXR0b24gb24gdGhpcy5nYW1lLmFjdGl2ZVBsYXllcidzIGJvYXJkXG4gICAgLy8gZm9yIHdoaWNoIGl0J3MgZGF0YXNldC54ID09PSB4IGFuZCBkYXRhc2V0LnkgPT09IHlcbiAgICBjb25zdCBib2FyZCA9IFtcbiAgICAgIC4uLih0aGlzLmdhbWUuYWN0aXZlUGxheWVyID09PSB0aGlzLmdhbWUucGxheWVyT25lXG4gICAgICAgID8gdGhpcy5wbGF5ZXJUd29Cb2FyZFxuICAgICAgICA6IHRoaXMucGxheWVyT25lQm9hcmRcbiAgICAgICkuY2hpbGRyZW4sXG4gICAgXS5mbGF0TWFwKChyb3cpID0+IFsuLi5yb3cuY2hpbGRyZW5dKTtcbiAgICByZXR1cm4gYm9hcmQuZmluZCgoYnRuKSA9PiBidG4uZGF0YXNldC54ID09IHggJiYgYnRuLmRhdGFzZXQueSA9PSB5KTtcbiAgfSxcbiAgcmVuZGVyQXR0YWNrKGNlbGwsIGNvb3JkaW5hdGVzKSB7XG4gICAgY29uc29sZS5sb2coY29vcmRpbmF0ZXMpO1xuICAgIGNvbnN0IGlzQXJyYXkgPSBjb29yZGluYXRlcy5ldmVyeSgoaXRlbSkgPT4gQXJyYXkuaXNBcnJheShpdGVtKSk7XG5cbiAgICBpZiAoaXNBcnJheSkge1xuICAgICAgY29vcmRpbmF0ZXMuZm9yRWFjaCgoY29vcmRpbmF0ZSkgPT4ge1xuICAgICAgICBjb25zdCBidXR0b24gPSB0aGlzLmdldEJ1dHRvbihjb29yZGluYXRlKTtcbiAgICAgICAgY29uc29sZS5sb2coYnV0dG9uKTtcbiAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ2RvbmUnKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBidXR0b24gPSB0aGlzLmdldEJ1dHRvbihjb29yZGluYXRlcyk7XG4gICAgICBidXR0b24uY2xhc3NMaXN0LmFkZChjZWxsLm1pc3MgPyAnbWlzcycgOiAnaGl0Jyk7XG4gICAgfVxuICAgIC8vIGNvbnN0IGJ1dHRvbiA9IHRoaXMuZ2V0QnV0dG9uKGNvb3JkaW5hdGVzKTtcbiAgICAvLyBidXR0b24uY2xhc3NMaXN0LmFkZChjZWxsLm1pc3MgPyAnbWlzcycgOiAnaGl0Jyk7XG4gIH0sXG4gIHJlbmRlcldhaXQoKSB7XG4gICAgbGV0IHBsYXllciA9ICdvbmUnO1xuICAgIGlmICh0aGlzLmdhbWUuYWN0aXZlUGxheWVyID09PSB0aGlzLmdhbWUucGxheWVyT25lKSB7XG4gICAgICAvLyBJZiBnYW1lLmFjdGl2ZVBsYXllciBpcyBOT1QgcGxheWVyT25lXG4gICAgICAvLyBQdXQgJ3dhaXQnIGNsYXNzIG9uIHRoZSBwbGF5ZXIgb25lJ3MgY29udGFpbmVyXG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBZb3VyIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgT3Bwb25lbnQncyBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBPcHBvbmVudCdzIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgWW91ciBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgICAgcGxheWVyID0gJ3R3byc7XG4gICAgfVxuXG4gICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsICd0dXJuJywgcGxheWVyKTtcblxuICAgIGlmICghdGhpcy5tb2RlICYmIHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIgPT09IHRoaXMuZ2FtZS5wbGF5ZXJUd28pIHtcbiAgICAgIC8vIE9wdGlvbmFsLCBwdXQgYSBzZXRUaW1lb3V0KClcbiAgICAgIHRoaXMuZ2FtZS5wbGF5Um91bmQoKTtcbiAgICB9XG4gIH0sXG4gIGVuZEdhbWUocGxheWVyKSB7XG4gICAgdGhpcy51bmJpbmRFdmVudHMoKTtcbiAgICBwdWJTdWIucHVibGlzaCgnbm90aWZ5JywgJ2dhbWVvdmVyJywgcGxheWVyKTtcbiAgfSxcbiAgYm9hcmRIYW5kbGVyKGUpIHtcbiAgICBjb25zdCBidG4gPSBlLnRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgIGNvbnN0IHggPSBwYXJzZUludChidG4uZGF0YXNldC54KTtcbiAgICBjb25zdCB5ID0gcGFyc2VJbnQoYnRuLmRhdGFzZXQueSk7XG4gICAgaWYgKCFpc05hTih4KSB8fCAhaXNOYU4oeSkpIHtcbiAgICAgIGNvbnN0IGNlbGwgPSB0aGlzLmdhbWUuYWN0aXZlUGxheWVyLm9wcG9uZW50Qm9hcmQuZ2V0Qm9hcmRDZWxsKFt4LCB5XSk7XG4gICAgICBpZiAoY2VsbC5taXNzID09PSBmYWxzZSB8fCBjZWxsLmhpdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5nYW1lLnBsYXlSb3VuZChbeCwgeV0pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbn0pO1xuIiwiaW1wb3J0IEdhbWVDb250cm9sbGVyIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvZ2FtZUNvbnRyb2xsZXInO1xuaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGNvbXBvc2VHYW1lIGZyb20gJy4vY29tcG9zZUdhbWUnO1xuaW1wb3J0IHBsYXlHYW1lIGZyb20gJy4vcGxheUdhbWUnO1xuaW1wb3J0IHBvcnQgZnJvbSAnLi4vcG9ydC9wb3J0JztcbmltcG9ydCBib2FyZCBmcm9tICcuLi9ib2FyZC9ib2FyZCc7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcyc7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9wb3J0LmNzcyc7XG5cbi8vIFRyeWluZyB0byBkZWNpZGUgd2hldGhlciBvciBub3QgaXQgaXMgYSBnb29kIGlkZWEgdG8gY3JlYXRlIGEgc2VwYXJhdGUgbW9kdWxlXG4vLyB0byBjb250cm9sIHRoZSBzY3JlZW4gYWZ0ZXIgcGxheWVycyBoYXZlIHBsYWNlZCBhbGwgdGhlaXIgc2hpcHNcbi8vIGFuZCBhZnRlciBhICdzdGFydCcgYnV0dG9uIGlzIGNsaWNrZWRcbmV4cG9ydCBkZWZhdWx0IChtb2RlKSA9PiB7XG4gIC8vIEJ1aWxkcyBlbXB0eSBib2FyZCBmb3IgcGxheWVycyB0byBwbGFjZSB0aGVpciBzaGlwc1xuICAvLyBtb2RlID09PSB0cnVlID0+IGh1bWFuIHZzIGh1bWFuXG4gIC8vIG1vZGUgPT09IGZhbHNlID0+IGh1bWFuIHZzIGNvbXB1dGVyXG5cbiAgY29uc3Qgc2NyZWVuQ29udHJvbGxlciA9IHtcbiAgICBtb2RlLFxuICAgIGdhbWVSZWFkeTogZmFsc2UsXG4gICAgZ2FtZTogR2FtZUNvbnRyb2xsZXIobW9kZSksXG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMuYm9hcmRzID0ge1xuICAgICAgICBwbGF5ZXJPbmU6IHRoaXMuZ2FtZS5wbGF5ZXJPbmVCb2FyZC5ib2FyZCxcbiAgICAgICAgcGxheWVyVHdvOiB0aGlzLmdhbWUucGxheWVyVHdvQm9hcmQuYm9hcmQsXG4gICAgICB9O1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsICdwbGFjZScpO1xuICAgICAgdGhpcy51cGRhdGVHYW1lU3RhdGUoY29tcG9zZUdhbWUpO1xuICAgICAgdGhpcy5wbGF5ID0gdGhpcy5wbGF5LmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmlzR2FtZVJlYWR5ID0gdGhpcy5pc0dhbWVSZWFkeS5iaW5kKHRoaXMpO1xuICAgIH0sXG4gICAgdXBkYXRlR2FtZVN0YXRlKGNhbGxiYWNrKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHRoaXMsIGNhbGxiYWNrKCkpO1xuICAgIH0sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5nYW1lQ29udGFpbmVyID0gZWxlbWVudDtcbiAgICAgIHRoaXMuYm9hcmRDb250YWluZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJyNib2FyZHNfY29udGFpbmVyJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUNvbnRhaW5lciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl9vbmUnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX3R3bycpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl9vbmUgPiAuYm9hcmQnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfdHdvID4gLmJvYXJkJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl9vbmUgPiBoNCcpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfdHdvID4gaDQnKTtcbiAgICAgIHRoaXMucGxheUJ0biA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXlfYnRuJyk7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgaWYgKCF0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICAvLyBpZiAoIXRoaXMubW9kZSkge1xuICAgICAgICB0aGlzLnBsYXlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLnBsYXkpO1xuICAgICAgICBwdWJTdWIuc3Vic2NyaWJlKCdwbGF5ZXJSZWFkeScsIHRoaXMuaXNHYW1lUmVhZHkpO1xuICAgICAgICAvLyB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICB0aGlzLnVwZGF0ZUdhbWVTdGF0ZShwbGF5R2FtZSk7XG4gICAgICAgIHRoaXMucmVuZGVyQXR0YWNrID0gdGhpcy5yZW5kZXJBdHRhY2suYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5lbmRHYW1lID0gdGhpcy5lbmRHYW1lLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucmVuZGVyV2FpdCA9IHRoaXMucmVuZGVyV2FpdC5iaW5kKHRoaXMpO1xuICAgICAgICBwdWJTdWIuc3Vic2NyaWJlKCdyZW5kZXJBdHRhY2snLCB0aGlzLnJlbmRlckF0dGFjayk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ2VuZGdhbWUnLCB0aGlzLmVuZEdhbWUpO1xuICAgICAgICBwdWJTdWIuc3Vic2NyaWJlKCdyZW5kZXJXYWl0JywgdGhpcy5yZW5kZXJXYWl0KTtcbiAgICAgICAgdGhpcy5ib2FyZEhhbmRsZXIgPSB0aGlzLmJvYXJkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgfVxuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgfSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBnYW1lQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnc2VjdGlvbicpO1xuICAgICAgY29uc3QgYm9hcmRzQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBwbGF5ZXJPbmVDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IHBsYXllclR3b0NvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgcGxheWVyT25lSGVhZGVyID0gY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgICAgIGNvbnN0IHBsYXllclR3b0hlYWRlciA9IGNyZWF0ZUVsZW1lbnQoJ2g0Jyk7XG4gICAgICBjb25zdCBnYW1lUGxheUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgZ2FtZVBsYXlCdG4gPSBjcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgIGNvbnN0IGdhbWVQbGF5QnRuVGV4dCA9IGNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgIGdhbWVQbGF5QnRuVGV4dC50ZXh0Q29udGVudCA9ICdQbGF5JztcbiAgICAgIGdhbWVDb250YWluZXIuaWQgPSAnZ2FtZV9jb250YWluZXInO1xuICAgICAgYm9hcmRzQ29udGFpbmVyLmlkID0gJ2JvYXJkc19jb250YWluZXInO1xuICAgICAgcGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3BsYXllcl9vbmUnKTtcbiAgICAgIHBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdwbGF5ZXJfdHdvJyk7XG4gICAgICBwbGF5ZXJPbmVIZWFkZXIudGV4dENvbnRlbnQgPSBgUGxheWVyIG9uZSdzIGdyaWRgO1xuICAgICAgcGxheWVyVHdvSGVhZGVyLnRleHRDb250ZW50ID0gYFBsYXllciB0d28ncyBncmlkYDtcbiAgICAgIGdhbWVQbGF5Q29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2dhbWVfcGxheScpO1xuICAgICAgZ2FtZVBsYXlCdG4uY2xhc3NMaXN0LmFkZCgncGxheV9idG4nKTtcbiAgICAgIC8vIFJlbmRlcnMgcGxheWVycycgYm9hcmRzXG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuYXBwZW5kQ2hpbGQoYm9hcmQodGhpcy5ib2FyZHMucGxheWVyT25lKSk7XG4gICAgICBwbGF5ZXJUd29Db250YWluZXIuYXBwZW5kQ2hpbGQoYm9hcmQodGhpcy5ib2FyZHMucGxheWVyVHdvKSk7XG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyT25lSGVhZGVyKTtcbiAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJUd29IZWFkZXIpO1xuICAgICAgYm9hcmRzQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllck9uZUNvbnRhaW5lcik7XG4gICAgICBib2FyZHNDb250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyVHdvQ29udGFpbmVyKTtcbiAgICAgIGdhbWVQbGF5QnRuLmFwcGVuZENoaWxkKGdhbWVQbGF5QnRuVGV4dCk7XG4gICAgICBnYW1lUGxheUNvbnRhaW5lci5hcHBlbmRDaGlsZChnYW1lUGxheUJ0bik7XG4gICAgICBpZiAoIXRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIHBsYXllck9uZUNvbnRhaW5lci5hcHBlbmRDaGlsZChwb3J0KCdwbGF5ZXJfb25lJywgdGhpcy5nYW1lLCB0aGlzLm1vZGUpKTtcbiAgICAgICAgaWYgKHRoaXMubW9kZSkge1xuICAgICAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZChwb3J0KCdwbGF5ZXJfdHdvJywgdGhpcy5nYW1lLCB0aGlzLm1vZGUpKTtcbiAgICAgICAgICBnYW1lUGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpbmFjdGl2ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdpbmFjdGl2ZScpO1xuICAgICAgICAgIHBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd3YWl0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKGdhbWVQbGF5Q29udGFpbmVyKTtcbiAgICAgIH1cblxuICAgICAgZ2FtZUNvbnRhaW5lci5hcHBlbmRDaGlsZChib2FyZHNDb250YWluZXIpO1xuICAgICAgaWYgKHRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIHRoaXMuZ2FtZUNvbnRhaW5lci5yZXBsYWNlV2l0aChnYW1lQ29udGFpbmVyKTtcbiAgICAgICAgYm9hcmRzQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2J1c3knKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2FjaGVET00oZ2FtZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIGlmICghdGhpcy5nYW1lUmVhZHkpIHJldHVybiBnYW1lQ29udGFpbmVyO1xuICAgIH0sXG4gIH07XG4gIHNjcmVlbkNvbnRyb2xsZXIuaW5pdCgpO1xuICByZXR1cm4gc2NyZWVuQ29udHJvbGxlci5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgR2FtZWJvYXJkIGZyb20gJy4vZ2FtZWJvYXJkJztcbmltcG9ydCBQbGF5ZXIgZnJvbSAnLi9wbGF5ZXInO1xuaW1wb3J0IHBpcGUgZnJvbSAnLi9waXBlJztcbmltcG9ydCBpc0h1bWFuIGZyb20gJy4vaXNIdW1hbic7XG5pbXBvcnQgaXNDb21wdXRlciBmcm9tICcuL2lzQ29tcHV0ZXInO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuL3B1YlN1Yic7XG4vLyBNb2R1bGUgdGhhdCBjb250cm9scyB0aGUgbWFpbiBnYW1lIGxvb3Bcbi8vIEZvciBub3cganVzdCBwb3B1bGF0ZSBlYWNoIEdhbWVib2FyZCB3aXRoIHByZWRldGVybWluZWQgY29vcmRpbmF0ZXMuXG4vLyBZb3UgYXJlIGdvaW5nIHRvIGltcGxlbWVudCBhIHN5c3RlbSBmb3IgYWxsb3dpbmcgcGxheWVycyB0byBwbGFjZSB0aGVpciBzaGlwcyBsYXRlci5cbmV4cG9ydCBkZWZhdWx0IChtb2RlKSA9PiB7XG4gIC8vIElmIG1vZGUgaXMgdHJ1ZSBwbGF5ZXIgdHdvIHdpbGwgYmUgYSBodW1hbiwgZWxzZSBhIGNvbXB1dGVyXG4gIC8vIFRoZSBnYW1lIGxvb3Agc2hvdWxkIHNldCB1cCBhIG5ldyBnYW1lIGJ5IGNyZWF0aW5nIFBsYXllcnMgYW5kIEdhbWVib2FyZHMuXG4gIC8vIDEuIENyZWF0ZSBnYW1lYm9hcmRzXG4gIC8vIDIuIENyZWF0ZSBwbGF5ZXJzIGFuZCBwYXNzIGluIHRoZWlyIGdhbWVib2FyZCBhbmQgdGhlIG9wcG9uZW50J3MgZ2FtZWJvYXJkLlxuICAvLyAgRG8gSSBvbmx5IG5lZWQgdG8gcGFzcyB0aGUgb3Bwb25lbnQncyBib2FyZD9cbiAgLy8gbGV0IGFjdGl2ZVBsYXllcjtcbiAgY29uc3QgcGxheWVyT25lQm9hcmQgPSBHYW1lYm9hcmQoKTtcbiAgY29uc3QgcGxheWVyVHdvQm9hcmQgPSBHYW1lYm9hcmQoKTtcblxuICBjb25zdCBwbGF5ZXJPbmUgPSBwaXBlKFBsYXllciwgaXNIdW1hbikocGxheWVyT25lQm9hcmQsIHBsYXllclR3b0JvYXJkKTtcbiAgY29uc3QgcGxheWVyVHdvID0gcGlwZShQbGF5ZXIsIG1vZGUgPyBpc0h1bWFuIDogaXNDb21wdXRlcikocGxheWVyVHdvQm9hcmQsIHBsYXllck9uZUJvYXJkKTtcblxuICBjb25zdCBwbGF5ZXJzID0gW3BsYXllck9uZSwgcGxheWVyVHdvXTtcbiAgbGV0IGFjdGl2ZVBsYXllciA9IHBsYXllcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMildO1xuXG4gIGNvbnN0IHN3aXRjaFBsYXllcnMgPSAocGxheWVyKSA9PiB7XG4gICAgaWYgKHBsYXllcikge1xuICAgICAgLy8gTG9va2luZyBpbnRvIExvZGFzaCBfLmlzRXF1YWwoKVxuICAgICAgLy8gQ291bGQgYWRkIGEgdHVybiBwcm9wZXJ0eSB0byBwbGF5ZXIgb2JqZWN0IHRoYXQgdGFrZXMgYSBib29sZWFuXG4gICAgICBhY3RpdmVQbGF5ZXIgPSBwbGF5ZXIgPT09IHBsYXllck9uZSA/IHBsYXllclR3byA6IHBsYXllck9uZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgcGxheVJvdW5kID0gKGNvb3JkaW5hdGUpID0+IHtcbiAgICAvLyBBbGxvdyBhIHBsYXllciB0byBhdHRhY2sgYWdhaW4gaWYgdGhlIGluaXRpYWwgYXR0YWNrIGhpdHMgYSBzaGlwXG4gICAgYWN0aXZlUGxheWVyLmF0dGFjayhjb29yZGluYXRlKTtcblxuICAgIGNvbnN0IHN0YXR1cyA9IGdldEdhbWVTdGF0dXMoKTtcbiAgICBpZiAoIXN0YXR1cy5zdGF0dXMpIHtcbiAgICAgIC8vIElmIGdhbWUgaXMgbm90IG92ZXIsIHN3aXRjaCBwbGF5ZXJzXG4gICAgICBzd2l0Y2hQbGF5ZXJzKGFjdGl2ZVBsYXllcik7XG4gICAgICBwdWJTdWIucHVibGlzaCgncmVuZGVyV2FpdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwdWJTdWIucHVibGlzaCgnZW5kZ2FtZScsIHN0YXR1cy5wbGF5ZXIpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBnZXRHYW1lU3RhdHVzID0gKCkgPT4ge1xuICAgIGNvbnN0IHN0YXR1cyA9IHsgc3RhdHVzOiBwbGF5ZXJPbmVCb2FyZC5nZXRTdGF0dXMoKSB8fCBwbGF5ZXJUd29Cb2FyZC5nZXRTdGF0dXMoKSB9O1xuICAgIGlmIChzdGF0dXMuc3RhdHVzKSB7XG4gICAgICAvLyBHYW1lIGlzIG92ZXJcbiAgICAgIGNvbnN0IHBsYXllciA9IHBsYXllck9uZUJvYXJkLmdldFN0YXR1cygpID8gJ3R3bycgOiAnb25lJztcbiAgICAgIE9iamVjdC5hc3NpZ24oc3RhdHVzLCB7IHBsYXllciB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXR1cztcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHN3aXRjaFBsYXllcnMsXG4gICAgcGxheVJvdW5kLFxuICAgIGdldEdhbWVTdGF0dXMsXG4gICAgZ2V0IGFjdGl2ZVBsYXllcigpIHtcbiAgICAgIHJldHVybiBhY3RpdmVQbGF5ZXI7XG4gICAgfSxcbiAgICBnZXQgcGxheWVyT25lKCkge1xuICAgICAgcmV0dXJuIHBsYXllck9uZTtcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJUd28oKSB7XG4gICAgICByZXR1cm4gcGxheWVyVHdvO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllck9uZUJvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllck9uZUJvYXJkO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllclR3b0JvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllclR3b0JvYXJkO1xuICAgIH0sXG4gIH07XG59O1xuIiwiaW1wb3J0IFNoaXAgZnJvbSAnLi4vY29udGFpbmVycy9zaGlwJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi9wdWJTdWInO1xuaW1wb3J0IGdlbmVyYXRlVVVJRCBmcm9tICcuLi9oZWxwZXJzL2dlbmVyYXRlVVVJRCc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgLy8gS2VlcCB0cmFjayBvZiBtaXNzZWQgYXR0YWNrcyBzbyB0aGV5IGNhbiBkaXNwbGF5IHRoZW0gcHJvcGVybHkuXG4gIC8vIEJlIGFibGUgdG8gcmVwb3J0IHdoZXRoZXIgb3Igbm90IGFsbCBvZiB0aGVpciBzaGlwcyBoYXZlIGJlZW4gc3Vuay5cbiAgLy8gVGhlIG1lbW8gYXJyYXkgc3RvcmVzIGEgQ2VsbCdzIHJlZmVyZW5jZXMgdGhhdCByZXNlbWJsZSB3aGVyZSBzaGlwcyBoYXZlIGJlZW4gcGxhY2VkLlxuICAvLyBUaGUgbWVtbyBhcnJheSBpcyB1c2VkIGluIHRoZSBtZXRob2RzIGNsZWFyQm9hcmQgYW5kIHBsYWNlU2hpcFxuICBjb25zdCBtZW1vID0gW107XG4gIGNvbnN0IENlbGwgPSAoc2hpcCkgPT4ge1xuICAgIHJldHVybiBzaGlwXG4gICAgICA/IHtcbiAgICAgICAgICBzaGlwLFxuICAgICAgICAgIGhpdDogZmFsc2UsXG4gICAgICAgICAgYXR0YWNrKCkge1xuICAgICAgICAgICAgdGhpcy5oaXQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zaGlwLmhpdCgpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIDoge1xuICAgICAgICAgIG1pc3M6IGZhbHNlLFxuICAgICAgICAgIGF0dGFjaygpIHtcbiAgICAgICAgICAgIHRoaXMubWlzcyA9IHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgfTtcbiAgY29uc3QgYm9hcmQgPSBuZXcgQXJyYXkoMTApLmZpbGwoKS5tYXAoKCkgPT4gbmV3IEFycmF5KDEwKS5maWxsKCkubWFwKCgpID0+IENlbGwoKSkpO1xuXG4gIGNvbnN0IGNsZWFyQm9hcmQgPSAoKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW1vLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBjb25zdCB7IHJvdywgY29sIH0gPSBtZW1vW2ldO1xuICAgICAgYm9hcmRbcm93XVtjb2xdID0gQ2VsbCgpO1xuICAgICAgbWVtby5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHBhcnNlQ29vcmRpbmF0ZSA9IChbeCwgeV0pID0+IHtcbiAgICAvLyBQYXJzZXMgY29vcmRpbmF0ZSBpbnB1dHRlZCBieSB1c2VyIHN1Y2ggdGhhdFxuICAgIC8vIHRoZSB2YWx1ZSBwYWlycyBjYW4gYmUgdXNlZCBmb3IgYWNjZXNzaW5nIGVsZW1lbnRzXG4gICAgLy8gaW4gdGhlIHR3byBkaW1lbnNpb25hbCBhcnJheVxuICAgIHJldHVybiBbYm9hcmQubGVuZ3RoIC0geSwgeCAtIDFdO1xuICB9O1xuXG4gIGNvbnN0IHVucGFyc2VDb29yZGluYXRlID0gKFt4LCB5XSkgPT4ge1xuICAgIHJldHVybiBbeSArIDEsIGJvYXJkLmxlbmd0aCAtIHhdO1xuICB9O1xuXG4gIGNvbnN0IGdlbmVyYXRlUmFuZG9tQ29vcmRpbmF0ZSA9ICgpID0+IHtcbiAgICAvLyBSZXR1cm5zIHJhbmRvbSBjb29yZGluYXRlIHdpdGggdmFsdWVzIGJldHdlZW4gMSBhbmQgMTBcbiAgICBjb25zdCBjb29yZGluYXRlID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpICs9IDEpIHtcbiAgICAgIGNvb3JkaW5hdGUucHVzaChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCArIDEpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvb3JkaW5hdGU7XG4gIH07XG5cbiAgY29uc3QgZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMgPSAoW3gsIHldLCBvcmllbnRhdGlvbiwgc2hpcExlbmd0aCkgPT4ge1xuICAgIGNvbnN0IGNvb3JkaW5hdGVzID0gW107XG5cbiAgICBpZiAob3JpZW50YXRpb24pIHtcbiAgICAgIC8vIFZlcnRpY2FsXG4gICAgICBmb3IgKGxldCBpID0geDsgaSA8IHggKyBzaGlwTGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29vcmRpbmF0ZXMucHVzaChbaSwgeV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIb3Jpem9udGFsXG4gICAgICBmb3IgKGxldCBpID0geTsgaSA8IHkgKyBzaGlwTGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29vcmRpbmF0ZXMucHVzaChbeCwgaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb29yZGluYXRlcztcbiAgfTtcblxuICBjb25zdCB2YWxpZGF0ZUNvb3JkaW5hdGUgPSAoeCwgeSkgPT4ge1xuICAgIHJldHVybiB4ID49IDAgJiYgeCA8IDEwICYmIHkgPj0gMCAmJiB5IDwgMTA7XG4gIH07XG5cbiAgY29uc3QgY2hlY2tCb2FyZCA9IChbeCwgeV0sIGlkKSA9PiB7XG4gICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgYSBzaGlwIGF0IHggYW5kIHlcbiAgICAvLyBDaGVjayBpZiBhbGwgc3Vycm91bmRpbmcgY29vcmRpbmF0ZXMgYXJlIHVuZGVmaW5lZFxuICAgIC8vIFJldHVybiB0cnVlIGlmIHNoaXAgY2FuIGJlIHBsYWNlXG4gICAgY29uc3QgYm9vbGVhbiA9IHZhbGlkYXRlQ29vcmRpbmF0ZSh4LCB5KTtcbiAgICBjb25zdCBjaGVjayA9IFtcbiAgICAgIFt4LCB5XSxcbiAgICAgIFt4LCB5ICsgMV0sXG4gICAgICBbeCwgeSAtIDFdLFxuICAgICAgW3ggKyAxLCB5XSxcbiAgICAgIFt4ICsgMSwgeSArIDFdLFxuICAgICAgW3ggKyAxLCB5IC0gMV0sXG4gICAgICBbeCAtIDEsIHldLFxuICAgICAgW3ggLSAxLCB5ICsgMV0sXG4gICAgICBbeCAtIDEsIHkgLSAxXSxcbiAgICBdO1xuICAgIHJldHVybiBjaGVjay5ldmVyeSgoW2EsIGJdKSA9PiB7XG4gICAgICAvLyBOZWVkIHRvIGNoZWNrIGlmIGEgYW5kIGIgYXJlIHdpdGhpbiB0aGUgYm9hcmQncyBzaXplXG4gICAgICAvLyBUaGUgdmFsdWUgb2YgYSBhbmQgYiBjYW4gb25seSBiZSBiZXR3ZWVuIGZyb20gMCB0byA5LlxuICAgICAgLy8gSXQgaXMgcG9pbnRsZXNzIHRvIGNoZWNrIGlmIHRoZXJlIGlzIHNwYWNlIHdoZW4gYSBzaGlwIGlzIHBsYWNlZCBhdCB0aGUgYm9yZGVyIG9mIHRoZSBib2FyZFxuICAgICAgcmV0dXJuIHZhbGlkYXRlQ29vcmRpbmF0ZShhLCBiKVxuICAgICAgICA/IGJvb2xlYW4gJiYgKGJvYXJkW2FdW2JdLnNoaXAgPT09IHVuZGVmaW5lZCB8fCBib2FyZFthXVtiXS5zaGlwLmlkID09PSBpZClcbiAgICAgICAgOiBib29sZWFuO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IHBsYWNlU2hpcCA9IChcbiAgICBjb29yZGluYXRlcyxcbiAgICBzaGlwTGVuZ3RoLFxuICAgIG9yaWVudGF0aW9uLFxuICAgIGlzRHJhZ2dpbmcsXG4gICAgaXNSb3RhdGluZyxcbiAgICBpZCxcbiAgICBkcm9wU3Vic2NyaWJlcixcbiAgICByb3RhdGVTdWJzY3JpYmVyLFxuICApID0+IHtcbiAgICAvLyBIb3cgbWFueSBwYXJhbWV0ZXJzIGlzIHRvbyBtdWNoP1xuXG4gICAgY29uc3QgW3gsIHldID0gcGFyc2VDb29yZGluYXRlKGNvb3JkaW5hdGVzKTtcbiAgICBjb25zdCBzaGlwQ29vcmRpbmF0ZXMgPSBnZW5lcmF0ZVNoaXBDb29yZGluYXRlcyhbeCwgeV0sIG9yaWVudGF0aW9uLCBzaGlwTGVuZ3RoKTtcbiAgICBjb25zdCBpc1ZhbGlkQ29vcmRpbmF0ZXMgPSBzaGlwQ29vcmRpbmF0ZXMuZXZlcnkoKGNvb3JkaW5hdGUpID0+IHtcbiAgICAgIHJldHVybiBjaGVja0JvYXJkKGNvb3JkaW5hdGUsIGlkKTtcbiAgICB9KTtcblxuICAgIGlmIChpc1ZhbGlkQ29vcmRpbmF0ZXMgJiYgIWlzRHJhZ2dpbmcpIHtcbiAgICAgIGNvbnN0IG5ld1NoaXAgPSBTaGlwKHNoaXBMZW5ndGgsIGlkKTtcbiAgICAgIC8vIENoZWNrIGlmIHggYW5kIHkgYXJlIHdpdGhpbiB0aGUgYm9hcmQncyBzaXplXG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIHNoaXAgYXQgeCBhbmQgeVxuXG4gICAgICBjb25zdCBpc1NoaXBPbkJvYXJkID0gbWVtby5zb21lKChjZWxsKSA9PiBjZWxsLmlkID09PSBpZCAmJiBpZCAhPT0gdW5kZWZpbmVkKTtcbiAgICAgIGlmIChpc1NoaXBPbkJvYXJkKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWVtby5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGlmIChtZW1vW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgICAgY29uc3QgeyByb3csIGNvbCB9ID0gbWVtb1tpXTtcbiAgICAgICAgICAgIGJvYXJkW3Jvd11bY29sXSA9IENlbGwoKTtcbiAgICAgICAgICAgIG1lbW8uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAob3JpZW50YXRpb24pIHtcbiAgICAgICAgLy8gVmVydGljYWxcbiAgICAgICAgZm9yIChsZXQgaSA9IHg7IGkgPCB4ICsgbmV3U2hpcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGJvYXJkW2ldW3ldID0gQ2VsbChuZXdTaGlwKTtcbiAgICAgICAgICBtZW1vLnB1c2goeyByb3c6IGksIGNvbDogeSwgaWQgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEhvcml6b250YWxcbiAgICAgICAgZm9yIChsZXQgaSA9IHk7IGkgPCB5ICsgbmV3U2hpcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGJvYXJkW3hdW2ldID0gQ2VsbChuZXdTaGlwKTtcbiAgICAgICAgICBtZW1vLnB1c2goeyByb3c6IHgsIGNvbDogaSwgaWQgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGlzUm90YXRpbmcpIHtcbiAgICAgICAgcHViU3ViLnB1Ymxpc2gocm90YXRlU3Vic2NyaWJlciwgdHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwdWJTdWIucHVibGlzaChkcm9wU3Vic2NyaWJlciwgZmFsc2UsIHRydWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWYWxpZENvb3JkaW5hdGVzICYmIGlzRHJhZ2dpbmcgJiYgIWlzUm90YXRpbmcpIHtcbiAgICAgIC8vIERyYWdnYWJsZSBzdGlsbCBkcmFnZ2luZyBhbmQgdmFsaWQgcGxhY2VtZW50XG4gICAgICBwdWJTdWIucHVibGlzaChkcm9wU3Vic2NyaWJlciwgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmICghaXNWYWxpZENvb3JkaW5hdGVzICYmIGlzRHJhZ2dpbmcgJiYgIWlzUm90YXRpbmcpIHtcbiAgICAgIC8vIERyYWdnYWJsZSBzdGlsbCBkcmFnZ2luZyBhbmQgaW52YWxpZCBwbGFjZW1lbnRcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKGRyb3BTdWJzY3JpYmVyLCB0cnVlLCBmYWxzZSk7XG4gICAgfSBlbHNlIGlmICghaXNWYWxpZENvb3JkaW5hdGVzICYmICFpc0RyYWdnaW5nICYmIGlzUm90YXRpbmcpIHtcbiAgICAgIC8vIERyYWdnYWJsZSBpcyBub3QgZHJhZ2dpbmcsIGludmFsaWQgcGxhY2VtZW50LCBhbmQgZmFpbHMgdG8gcm90YXRlXG4gICAgICBwdWJTdWIucHVibGlzaChyb3RhdGVTdWJzY3JpYmVyLCBmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHBsYWNlU2hpcHNSYW5kb20gPSAoKSA9PiB7XG4gICAgY29uc3Qgc2hpcHMgPSBbNCwgMywgMywgMiwgMiwgMiwgMSwgMSwgMSwgMV07XG4gICAgY29uc3QgY29vcmRpbmF0ZXMgPSBbXTtcbiAgICBsZXQgaSA9IDA7XG5cbiAgICB3aGlsZSAoaSA8IHNoaXBzLmxlbmd0aCkge1xuICAgICAgY29uc3QgW3gsIHldID0gZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4gICAgICBjb25zdCBbcGFyc2VkWCwgcGFyc2VkWV0gPSBwYXJzZUNvb3JkaW5hdGUoW3gsIHldKTtcbiAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMikgPT09IDE7XG4gICAgICBjb25zdCBzaGlwTGVuZ3RoID0gc2hpcHNbaV07XG4gICAgICBjb25zdCBzaGlwQ29vcmRpbmF0ZXMgPSBnZW5lcmF0ZVNoaXBDb29yZGluYXRlcyhbcGFyc2VkWCwgcGFyc2VkWV0sIG9yaWVudGF0aW9uLCBzaGlwTGVuZ3RoKTtcbiAgICAgIGNvbnN0IGlzVmFsaWRDb29yZGluYXRlID0gc2hpcENvb3JkaW5hdGVzLmV2ZXJ5KGNoZWNrQm9hcmQpO1xuICAgICAgaWYgKCFjb29yZGluYXRlcy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkgJiYgaXNWYWxpZENvb3JkaW5hdGUpIHtcbiAgICAgICAgcGxhY2VTaGlwKFt4LCB5XSwgc2hpcExlbmd0aCwgb3JpZW50YXRpb24sIGZhbHNlLCBmYWxzZSwgZ2VuZXJhdGVVVUlEKCkpO1xuICAgICAgICBjb29yZGluYXRlcy5wdXNoKFt4LCB5XSk7XG4gICAgICAgIGkgKz0gMTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgY29uc3Qgc2hvdHMgPSBbXTtcbiAgY29uc3QgdmFsaWRhdGVBdHRhY2sgPSAoeCwgeSkgPT4ge1xuICAgIC8vIENoZWNrcyBpZiBjb29yZGluYXRlIGlzIHdpdGggdGhlIGJvYXJkIHNpemUgYW5kIGhhcyBub3QgYmVlbiBhdHRhY2tlZFxuICAgIGNvbnN0IFthLCBiXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgIHJldHVybiAhc2hvdHMuZmluZCgoW2EsIGJdKSA9PiBhID09PSB4ICYmIGIgPT09IHkpICYmIHZhbGlkYXRlQ29vcmRpbmF0ZShhLCBiKTtcbiAgfTtcblxuICBjb25zdCByZWNlaXZlQXR0YWNrID0gKFt4LCB5XSkgPT4ge1xuICAgIC8vIEhhdmUgYSByZWNlaXZlQXR0YWNrIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBwYWlyIG9mIGNvb3JkaW5hdGVzXG4gICAgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgYXR0YWNrIGhpdCBhIHNoaXBcbiAgICAvLyBUaGVuIHNlbmRzIHRoZSDigJhoaXTigJkgZnVuY3Rpb24gdG8gdGhlIGNvcnJlY3Qgc2hpcCwgb3IgcmVjb3JkcyB0aGUgY29vcmRpbmF0ZXMgb2YgdGhlIG1pc3NlZCBzaG90LlxuICAgIGNvbnN0IGNlbGwgPSBnZXRCb2FyZENlbGwoW3gsIHldKTtcbiAgICBjb25zdCBpc1ZhbGlkQXR0YWNrID0gdmFsaWRhdGVBdHRhY2soeCwgeSk7XG5cbiAgICBpZiAoaXNWYWxpZEF0dGFjaykge1xuICAgICAgY2VsbC5hdHRhY2soKTtcbiAgICAgIHNob3RzLnB1c2goW3gsIHldKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdyZW5kZXJBdHRhY2snLCBjZWxsLCBbeCwgeV0pO1xuICAgICAgY29uc3Qgc2hpcCA9IGNlbGwuc2hpcDtcbiAgICAgIGlmIChzaGlwICYmIHNoaXAuaXNTdW5rKCkpIHtcbiAgICAgICAgLy8gTmVlZCB0byBmaW5kIGFsbCBjb29yZGluYXRlcyBmb3IgdGhlIHNoaXBcbiAgICAgICAgLy8gY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gbWVtby5maWx0ZXIoKHNoaXBNZW1vKSA9PiBzaGlwTWVtby5pZCA9PT0gc2hpcC5pZCk7XG4gICAgICAgIGNvbnN0IHNoaXBDb29yZGluYXRlcyA9IG1lbW8ucmVkdWNlKChhY2N1bXVsYXRvciwgY3VycmVudCkgPT4ge1xuICAgICAgICAgIGlmIChjdXJyZW50LmlkID09PSBzaGlwLmlkKSB7XG4gICAgICAgICAgICBhY2N1bXVsYXRvci5wdXNoKHVucGFyc2VDb29yZGluYXRlKFtjdXJyZW50LnJvdywgY3VycmVudC5jb2xdKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBwdWJTdWIucHVibGlzaCgncmVuZGVyQXR0YWNrJywgY2VsbCwgc2hpcENvb3JkaW5hdGVzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZ2V0U3RhdHVzID0gKCkgPT4ge1xuICAgIC8vIFJlcG9ydHMgd2hldGhlciBvciBub3QgYWxsIG9mIHRoZWlyIHNoaXBzIGhhdmUgYmVlbiBzdW5rLlxuICAgIGNvbnN0IGZsYXRCb2FyZCA9IGJvYXJkLmZsYXQoKS5maWx0ZXIoKGNlbGwpID0+IGNlbGwuc2hpcCAhPT0gdW5kZWZpbmVkKTtcbiAgICByZXR1cm4gZmxhdEJvYXJkLmV2ZXJ5KChjZWxsKSA9PiBjZWxsLnNoaXAuaXNTdW5rKCkpO1xuICB9O1xuXG4gIGNvbnN0IGdldEJvYXJkQ2VsbCA9IChbeCwgeV0pID0+IHtcbiAgICBjb25zdCBbYSwgYl0gPSBwYXJzZUNvb3JkaW5hdGUoW3gsIHldKTtcbiAgICByZXR1cm4gYm9hcmRbYV1bYl07XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICByZWNlaXZlQXR0YWNrLFxuICAgIHBsYWNlU2hpcCxcbiAgICBwbGFjZVNoaXBzUmFuZG9tLFxuICAgIGdldFN0YXR1cyxcbiAgICBnZXRCb2FyZENlbGwsXG4gICAgY2xlYXJCb2FyZCxcbiAgICBnZXQgYm9hcmQoKSB7XG4gICAgICByZXR1cm4gYm9hcmQ7XG4gICAgfSxcbiAgfTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAocGxheWVyKSA9PiB7XG4gIC8vIE1ha2UgdGhlIOKAmGNvbXB1dGVy4oCZIGNhcGFibGUgb2YgbWFraW5nIHJhbmRvbSBwbGF5cy5cbiAgLy8gVGhlIEFJIGRvZXMgbm90IGhhdmUgdG8gYmUgc21hcnQsXG4gIC8vIEJ1dCBpdCBzaG91bGQga25vdyB3aGV0aGVyIG9yIG5vdCBhIGdpdmVuIG1vdmUgaXMgbGVnYWxcbiAgLy8gKGkuZS4gaXQgc2hvdWxkbuKAmXQgc2hvb3QgdGhlIHNhbWUgY29vcmRpbmF0ZSB0d2ljZSkuXG5cbiAgY29uc3Qgc2hvdHMgPSBbXTtcbiAgY29uc3QgZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlID0gKCkgPT4ge1xuICAgIC8vIFJldHVybnMgcmFuZG9tIGNvb3JkaW5hdGUgd2l0aCB2YWx1ZXMgYmV0d2VlbiAxIGFuZCAxMFxuICAgIGNvbnN0IGNvb3JkaW5hdGUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDI7IGkgKz0gMSkge1xuICAgICAgY29vcmRpbmF0ZS5wdXNoKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwICsgMSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29vcmRpbmF0ZTtcbiAgfTtcblxuICBjb25zdCBhdHRhY2sgPSAoKSA9PiB7XG4gICAgLy8gUmV0dXJucyBhIHJhbmRvbSB1bmlxdWUgY29vcmRpbmF0ZSB0aGF0IGlzIGluLWJvdW5kcyBvZiB0aGUgYm9hcmRcbiAgICAvLyBOb3RlLCBpZiBzaG90cy5sZW5ndGggaXMgMTAwLCBnYW1lIHdpbGwgYmUgb3ZlclxuICAgIC8vIFRoZXJlIGFyZSBvbmx5IDEwMCBjb29yZGluYXRlcyB0byBhdHRhY2tcbiAgICB3aGlsZSAoc2hvdHMubGVuZ3RoIDwgMTAwKSB7XG4gICAgICBsZXQgW3gsIHldID0gZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4gICAgICBpZiAoIXNob3RzLmZpbmQoKFthLCBiXSkgPT4gYSA9PT0geCAmJiBiID09PSB5KSkge1xuICAgICAgICBwbGF5ZXIub3Bwb25lbnRCb2FyZC5yZWNlaXZlQXR0YWNrKFt4LCB5XSk7XG4gICAgICAgIHNob3RzLnB1c2goW3gsIHldKTtcbiAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHsgYXR0YWNrIH07XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgKHBsYXllcikgPT4gKHtcbiAgYXR0YWNrOiAoW3gsIHldKSA9PiB7XG4gICAgcGxheWVyLm9wcG9uZW50Qm9hcmQucmVjZWl2ZUF0dGFjayhbeCwgeV0pO1xuICAgIHJldHVybiBbeCwgeV07XG4gIH0sXG59KTtcbiIsIi8vIEFydGljbGVzIGFib3V0IGxvb3NlbHkgY291cGxpbmcgb2JqZWN0IGluaGVyaXRhbmNlIHdpdGggZmFjdG9yeSBmdW5jdGlvbnMgYW5kIHBpcGVcbi8vIGh0dHBzOi8vbWVkaXVtLmNvbS9kYWlseWpzL2J1aWxkaW5nLWFuZC1jb21wb3NpbmctZmFjdG9yeS1mdW5jdGlvbnMtNTBmZTkwMTQxMzc0XG4vLyBodHRwczovL3d3dy5mcmVlY29kZWNhbXAub3JnL25ld3MvcGlwZS1hbmQtY29tcG9zZS1pbi1qYXZhc2NyaXB0LTViMDQwMDRhYzkzNy9cbi8vIE9ic2VydmF0aW9uOiBpZiB0aGVyZSBpcyBubyBpbml0aWFsIHZhbHVlLCB0aGUgZmlyc3QgZnVuY3Rpb24gZG9lcyBub3QgcnVuXG5leHBvcnQgZGVmYXVsdCAoaW5pdGlhbEZuLCAuLi5mbnMpID0+XG4gICguLi52YWx1ZXMpID0+IHtcbiAgICByZXR1cm4gZm5zLnJlZHVjZSgob2JqLCBmbikgPT4ge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqLCBmbihvYmopKTtcbiAgICB9LCBpbml0aWFsRm4odmFsdWVzKSk7XG4gIH07XG4iLCIvLyBQbGF5ZXJzIGNhbiB0YWtlIHR1cm5zIHBsYXlpbmcgdGhlIGdhbWUgYnkgYXR0YWNraW5nIHRoZSBlbmVteSBHYW1lYm9hcmQuXG4vLyBUaGUgZ2FtZSBpcyBwbGF5ZWQgYWdhaW5zdCB0aGUgY29tcHV0ZXIsXG5cbi8vIERvZXMgZWFjaCBwbGF5ZXIgaGF2ZSB0aGVpciBvd24gZ2FtZWJvYXJkP1xuLy8gRG9lcyBlYWNoIHBsYXllciBoYXZlIGFjY2VzcyB0byB0aGUgb3Bwb25lbnQncyBnYW1lYm9hcmQ/XG4vLyBIb3cgdG8gZGVjaWRlIGlmIGdhbWUgaXMgcGxheWVyIHZzIHBsYXllciBhbmQgcGxheWVyIHZzIGNvbXB1dGVyP1xuZXhwb3J0IGRlZmF1bHQgKFtwbGF5ZXJCb2FyZCwgb3Bwb25lbnRCb2FyZF0pID0+IHtcbiAgLy8gY29uc3QgYm9hcmQgPSBwbGF5ZXJCb2FyZDtcbiAgLy8gRG8gSSBuZWVkIHRvIGRlY2xhcmUgdGhlIGNvbnN0IHZhcmlhYmxlP1xuICBjb25zdCBzdGF0ZSA9IHtcbiAgICBnZXQgb3Bwb25lbnRCb2FyZCgpIHtcbiAgICAgIHJldHVybiBvcHBvbmVudEJvYXJkO1xuICAgIH0sXG4gICAgZ2V0IGJvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllckJvYXJkO1xuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIHN0YXRlO1xufTtcblxuLypcbmNvbnN0IHBpcGUgPSAoaW5pdGlhbEZuLCAuLi5mbnMpID0+IHtcbiAgcmV0dXJuIGZucy5yZWR1Y2UoKG9iaiwgZm4pID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIGZuKG9iaikpO1xuICB9LCBpbml0aWFsRm4oKSk7XG59O1xuXG5jb25zdCBBbmltYWwgPSAoKSA9PiB7XG4gIGxldCB3ZWlnaHQ7XG5cbiAgY29uc3Qgc3RhdGUgPSB7XG4gICAgd2VpZ2h0LFxuICAgIGluZm86ICgpID0+ICh7XG4gICAgICB3ZWlnaHQ6IHN0YXRlLndlaWdodCxcbiAgICAgIGxlZ3M6IHN0YXRlLmxlZ3MsXG4gICAgfSksXG4gIH07XG4gIHJldHVybiBzdGF0ZTtcbn07XG5cbmNvbnN0IENhdCA9IChzdGF0ZSkgPT4gKHtcbiAgdHlwZTogJ2NhdCcsXG4gIGxlZ3M6IDQsXG4gIHNwZWFrOiAoKSA9PiBgbWVvdywgSSBoYXZlICR7c3RhdGUubGVnc30gbGVnc2AsXG4gIHBvb3A6ICgpID0+IGBtZW93Li4uSSBhbSBwb29waW5nLmAsXG4gIHBvb3BBZ2FpbjogKCkgPT4gYCR7c3RhdGUucG9vcCgpfSBtZW93IG1lb3cuLi5JIGFtIHBvb3Bpbmcgb25jZSBtb3JlYCxcbn0pO1xuXG5jb25zdCBCaXJkID0gKHN0YXRlKSA9PiAoe1xuICB0eXBlOiAnYmlyZCcsXG4gIGxlZ3M6IDIsXG4gIHNwZWFrOiAoKSA9PiBgY2hpcnAuLi5jaGlycCwgSSBoYXZlICR7c3RhdGUubGVnc30gbGVnc2AsXG4gIHBvb3A6ICgpID0+IGBjaGlycC4uLkkgYW0gcG9vcGluZy5gLFxuICBwb29wQWdhaW46ICgpID0+IGAke3N0YXRlLnBvb3AoKX0gY2hpcnAgY2hpcnAuLi5JIGFtIHBvb3Bpbmcgb25jZSBtb3JlYCxcbn0pO1xuXG5jb25zdCBXaXphcmQgPSAoc3RhdGUpID0+ICh7XG4gIGZpcmViYWxsOiAoKSA9PiBgJHtzdGF0ZS50eXBlfSBpcyBjYXN0aW5nIGZpcmViYWxsYCxcbn0pO1xuXG5jb25zdCBOZWNyb21hbmNlciA9IChzdGF0ZSkgPT4gKHtcbiAgZGVmaWxlRGVhZDogKCkgPT4gYCR7c3RhdGUudHlwZX0gaXMgY2FzdGluZyBkZWZpbGUgZGVhZGAsXG59KTtcblxuY29uc3QgY2F0ID0gcGlwZShBbmltYWwsIENhdCwgV2l6YXJkKTtcbmNvbnN0IGJpcmQgPSBwaXBlKEFuaW1hbCwgQmlyZCwgTmVjcm9tYW5jZXIpO1xuY29uc29sZS5sb2coY2F0LmZpcmViYWxsKCkpO1xuY29uc29sZS5sb2coY2F0LnNwZWFrKCkpO1xuY29uc29sZS5sb2coY2F0LmluZm8oKSk7XG5jYXQud2VpZ2h0ID0gMTA7XG5jb25zb2xlLmxvZyhjYXQuaW5mbygpKTtcbmNvbnNvbGUubG9nKGJpcmQuZGVmaWxlRGVhZCgpKTtcbmNvbnNvbGUubG9nKGJpcmQuc3BlYWsoKSk7XG5jb25zb2xlLmxvZyhiaXJkLmluZm8oKSk7XG5iaXJkLndlaWdodCA9IDM7XG5jb25zb2xlLmxvZyhiaXJkLmluZm8oKSk7XG4qL1xuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBzdWJzY3JpYmVyczoge30sXG4gIHN1YnNjcmliZShzdWJzY3JpYmVyLCBmbikge1xuICAgIC8vIFdoZW4gd291bGQgeW91IHdhbnQgdG8gc3Vic2NyaWJlIGEgc2luZ2xlIGZ1bmN0aW9uIGluIHRoZSBzYW1lIHN1YnNjcmliZXIgbW9yZSB0aGFuIG9uY2U/XG4gICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXSA9IHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0gfHwgW107XG4gICAgaWYgKCF0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmZpbmQoKGhhbmRsZXIpID0+IGhhbmRsZXIubmFtZSA9PT0gZm4ubmFtZSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKHN1YnNjcmliZXIpO1xuICAgICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5wdXNoKGZuKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2codGhpcy5zdWJzY3JpYmVycyk7XG4gIH0sXG4gIHVuc3Vic2NyaWJlKHN1YnNjcmliZXIsIGZuKSB7XG4gICAgaWYgKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0pIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uc3BsaWNlKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0uaW5kZXhPZihmbiksIDEpO1xuICAgICAgaWYgKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0ubGVuZ3RoID09PSAwKSBkZWxldGUgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXTtcbiAgICB9XG4gIH0sXG4gIHB1Ymxpc2goc3Vic2NyaWJlciwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmZvckVhY2goKGZuKSA9PiBmbiguLi5hcmdzKSk7XG4gICAgfVxuICB9LFxufTtcbiIsImV4cG9ydCBkZWZhdWx0IChzaGlwTGVuZ3RoLCBzaGlwSUQpID0+IHtcbiAgLy8gUHJvcGVydGllczpcbiAgLy8gIExlbmd0aFxuICAvLyAgTnVtYmVycyBvZiB0aW1lcyBoaXRcbiAgLy8gIFN1bmsgKHRydWUvZmFsc2UpXG4gIC8vIE1ldGhvZHM6XG4gIC8vICBIaXQsIGluY3JlYXNlcyB0aGUgbnVtYmVyIG9mIOKAmGhpdHPigJkgaW4geW91ciBzaGlwLlxuICAvLyAgaXNTdW5rKCkgY2FsY3VsYXRlcyB3aGV0aGVyIGEgc2hpcCBpcyBjb25zaWRlcmVkIHN1bmtcbiAgLy8gICAgQmFzZWQgb24gaXRzIGxlbmd0aCBhbmQgdGhlIG51bWJlciBvZiBoaXRzIGl0IGhhcyByZWNlaXZlZC5cbiAgLy8gLSBDYXJyaWVyXHQgICAgNVxuICAvLyAtIEJhdHRsZXNoaXBcdCAgNFxuICAvLyAtIERlc3Ryb3llclx0ICAzXG4gIC8vIC0gU3VibWFyaW5lXHQgIDNcbiAgLy8gLSBQYXRyb2wgQm9hdFx0MlxuICAvLyBjb25zdCBsZW5ndGggPSBzaXplO1xuICAvLyBIb3cgb3Igd2hlbiB0byBpbml0aWFsaXplIGEgc2hpcCdzIGxlbmd0aFxuICAvLyBXaGF0IGRldGVybWluZXMgYSBzaGlwcyBsZW5ndGg/XG4gIGNvbnN0IGxlbmd0aCA9IHNoaXBMZW5ndGg7XG4gIGNvbnN0IGlkID0gc2hpcElEO1xuICBsZXQgbnVtSGl0cyA9IDA7XG4gIGxldCBzdW5rID0gZmFsc2U7XG4gIGNvbnN0IGhpdCA9ICgpID0+IHtcbiAgICBpZiAoIXN1bmspIG51bUhpdHMgKz0gMTtcbiAgfTtcbiAgY29uc3QgaXNTdW5rID0gKCkgPT4ge1xuICAgIHN1bmsgPSBudW1IaXRzID09PSBsZW5ndGg7XG4gICAgcmV0dXJuIHN1bms7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBoaXQsXG4gICAgaXNTdW5rLFxuICAgIGdldCBsZW5ndGgoKSB7XG4gICAgICByZXR1cm4gbGVuZ3RoO1xuICAgIH0sXG4gICAgZ2V0IGlkKCkge1xuICAgICAgcmV0dXJuIGlkO1xuICAgIH0sXG4gIH07XG59O1xuIiwiaW1wb3J0IGdlbmVyYXRlVVVJRCBmcm9tICcuL2dlbmVyYXRlVVVJRCc7XG5cbmNvbnN0IEJ1aWxkRWxlbWVudCA9IChzdGF0ZSkgPT4gKHtcbiAgc2V0QXR0cmlidXRlczogKGF0dHJpYnV0ZXMpID0+IHtcbiAgICBPYmplY3QuZW50cmllcyhhdHRyaWJ1dGVzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmIChrZXkgIT09ICd0ZXh0Q29udGVudCcpIHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzJykge1xuICAgICAgICAgIHN0YXRlLnNldENsYXNzTmFtZSh2YWx1ZS5zcGxpdCgvXFxzLykpO1xuICAgICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgIHN0YXRlLnNldFN0eWxlKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChrZXkgPT09ICdkYXRhLWlkJykge1xuICAgICAgICAgIHN0YXRlLnNldEF0dHJpYnV0ZShrZXksIGdlbmVyYXRlVVVJRCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZS5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnNldFRleHRDb250ZW50KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgc2V0U3R5bGU6ICh0ZXh0KSA9PiB7XG4gICAgc3RhdGUuc3R5bGUuY3NzVGV4dCA9IHRleHQ7XG4gIH0sXG4gIHNldElEOiAoaWQpID0+IHtcbiAgICBzdGF0ZS5pZCA9IGlkO1xuICB9LFxuICBzZXRDbGFzc05hbWU6IChhcnJDbGFzcykgPT4ge1xuICAgIGFyckNsYXNzLmZvckVhY2goKGNsYXNzTmFtZSkgPT4gc3RhdGUuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpKTtcbiAgfSxcbiAgc2V0VGV4dENvbnRlbnQ6ICh0ZXh0KSA9PiB7XG4gICAgc3RhdGUudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB9LFxuICBzZXRDaGlsZHJlbjogKGNoaWxkcmVuKSA9PiB7XG4gICAgY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoY2hpbGQuZWxlbWVudCk7XG4gICAgICBpZiAoY2hpbGQuYXR0cmlidXRlcyAmJiBjaGlsZC5hdHRyaWJ1dGVzLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdPYmplY3QnKSB7XG4gICAgICAgIGNoaWxkRWxlbWVudC5zZXRBdHRyaWJ1dGVzKGNoaWxkLmF0dHJpYnV0ZXMpO1xuICAgICAgfVxuICAgICAgaWYgKGNoaWxkLmNoaWxkcmVuKSB7XG4gICAgICAgIC8vIFdoYXQgaWYgY2hpbGQgb2YgY2hpbGQuY2hpbGRyZW4gaGFzIGNoaWxkcmVuP1xuICAgICAgICBjaGlsZEVsZW1lbnQuc2V0Q2hpbGRyZW4oY2hpbGQuY2hpbGRyZW4pO1xuICAgICAgfVxuICAgICAgc3RhdGUuYXBwZW5kQ2hpbGQoY2hpbGRFbGVtZW50KTtcbiAgICB9KTtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZykge1xuICBjb25zdCBodG1sRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcblxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihodG1sRWxlbWVudCwgQnVpbGRFbGVtZW50KGh0bWxFbGVtZW50KSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IDYgY2hhcmFjdGVycyBmcm9tIGNyeXB0by5yYW5kb21VVUlEKClcbiAgLy8gUHNldWRvLXJhbmRvbWx5IGNoYW5nZXMgYSBsb3dlcmNhc2UgbGV0dGVyIHRvIHVwcGVyY2FzZVxuICBjb25zdCB1dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgcmV0dXJuIFsuLi51dWlkLnN1YnN0cmluZygwLCB1dWlkLmluZGV4T2YoJy0nKSldLnJlZHVjZSgod29yZCwgY3VycmVudENoYXIpID0+IHtcbiAgICBjb25zdCBjaGVjayA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpO1xuICAgIGlmIChjaGVjayA9PSBmYWxzZSAmJiBjdXJyZW50Q2hhci5tYXRjaCgvW2Etel0vKSkge1xuICAgICAgcmV0dXJuIHdvcmQgKyBjdXJyZW50Q2hhci50b1VwcGVyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gd29yZCArIGN1cnJlbnRDaGFyO1xuICB9KTtcbn07XG5cbi8qXG5PcHRpb25hbCB3YXkgbm90IHVzaW5nIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKVxuY29uc3QgZ2VuZXJhdGVVVUlEID0gKCkgPT4ge1xuICBjb25zdCB1dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICByZXR1cm4gWy4uLnV1aWQuc3Vic3RyaW5nKDAsIHV1aWQuaW5kZXhPZignLScpKV0ubWFwKChjaGFyKSA9PiB7XG4gICAgICBjb25zdCBjaGVjayA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpO1xuICAgICAgaWYgKGNoZWNrID09IGZhbHNlICYmIGNoYXIubWF0Y2goL1thLXpdLykpIHtcbiAgICAgICAgcmV0dXJuIGNoYXIudG9VcHBlckNhc2UoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGFyO1xuICAgIH0pLmpvaW4oJycpO1xufTtcbiovXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=