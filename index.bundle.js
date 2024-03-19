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
}

body {
  min-height: 100svh;
  background-color: rgb(149, 116, 59);
  font-family: 'Roboto Condensed', Arial;
  font-family: 'Roboto Condensed';
  font-family: Arial;
}
`, "",{"version":3,"sources":["webpack://./src/app.css"],"names":[],"mappings":"AAAA;EACE,uDAAuD;EACvD,+BAA+B;EAC/B,4CAA2E;EAC3E,gBAAgB;EAChB,kBAAkB;AACpB;;AAEA;;;EAGE,UAAU;EACV,SAAS;EACT,sBAAsB;AACxB;;AAEA;EACE,kBAAkB;EAClB,mCAAmC;EACnC,sCAAsC;EACtC,+BAA+B;EAC/B,kBAAkB;AACpB","sourcesContent":["@font-face {\n  /* https://fonts.google.com/specimen/Roboto+Condensed */\n  font-family: 'Roboto Condensed';\n  src: url(./assets/fonts/Roboto_Condensed/static/RobotoCondensed-Medium.ttf);\n  font-weight: 600;\n  font-style: normal;\n}\n\n*,\n*::before,\n*::after {\n  padding: 0;\n  margin: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  min-height: 100svh;\n  background-color: rgb(149, 116, 59);\n  font-family: 'Roboto Condensed', Arial;\n  font-family: 'Roboto Condensed';\n  font-family: Arial;\n}\n"],"sourceRoot":""}]);
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
  display: flex;
  justify-content: center;
  gap: 4rem;
}

.player_two.wait > .game_start {
  display: block;
  position: absolute;
  top: 20%;
}

.player_one.wait > .board,
.player_one.wait > h4,
.player_two.wait > .board,
.player_two.wait > h4 {
  opacity: 0.4;
}

.player_one,
.player_two {
  position: relative;
  font-size: 2rem;
}

#board_container > * > .board {
  display: grid;
  grid-template-columns: repeat(10, 2em);
  grid-auto-rows: 2em;
}

#board_container > *:not(.wait) > .board > .cell > .cell_content > .ship {
  background-color: transparent;
}

.player_two > .game_start {
  display: none;
}

.game_start > button {
  width: 150px;
  height: 150px;
  font-size: 4rem;
}

.cell {
  /* width: 16px;
  height: 16px; */
  background-color: white;
  border: 0.5px solid black;
  position: relative;
  cursor: pointer;
}

.cell > * {
  pointer-events: none;
}

.cell > .cell_content {
  height: 100%;
}

.cell > .cell_content > .ship {
  /*
  Show ship during placing ships phase
  Show only active player's ship when game is in play
  */
  height: inherit;
  background-color: cornflowerblue;
}

#board_container > * .board > .cell.hit > .cell_content > .ship {
  background-color: red;
}

#board_container > * > .board > .cell.miss {
  background-color: grey;
}

.cell > .row_marker {
  position: absolute;
  height: 100%;
  display: flex;
  left: -2em;
  top: 0;
  align-items: center;
}

.cell > .col_marker {
  position: absolute;
  top: -2em;
  text-align: center;
  width: 100%;
}
`, "",{"version":3,"sources":["webpack://./src/styles/screenController.css"],"names":[],"mappings":"AAAA;EACE,aAAa;EACb,uBAAuB;EACvB,SAAS;AACX;;AAEA;EACE,cAAc;EACd,kBAAkB;EAClB,QAAQ;AACV;;AAEA;;;;EAIE,YAAY;AACd;;AAEA;;EAEE,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,aAAa;EACb,sCAAsC;EACtC,mBAAmB;AACrB;;AAEA;EACE,6BAA6B;AAC/B;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,YAAY;EACZ,aAAa;EACb,eAAe;AACjB;;AAEA;EACE;iBACe;EACf,uBAAuB;EACvB,yBAAyB;EACzB,kBAAkB;EAClB,eAAe;AACjB;;AAEA;EACE,oBAAoB;AACtB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE;;;GAGC;EACD,eAAe;EACf,gCAAgC;AAClC;;AAEA;EACE,qBAAqB;AACvB;;AAEA;EACE,sBAAsB;AACxB;;AAEA;EACE,kBAAkB;EAClB,YAAY;EACZ,aAAa;EACb,UAAU;EACV,MAAM;EACN,mBAAmB;AACrB;;AAEA;EACE,kBAAkB;EAClB,SAAS;EACT,kBAAkB;EAClB,WAAW;AACb","sourcesContent":["#board_container {\n  display: flex;\n  justify-content: center;\n  gap: 4rem;\n}\n\n.player_two.wait > .game_start {\n  display: block;\n  position: absolute;\n  top: 20%;\n}\n\n.player_one.wait > .board,\n.player_one.wait > h4,\n.player_two.wait > .board,\n.player_two.wait > h4 {\n  opacity: 0.4;\n}\n\n.player_one,\n.player_two {\n  position: relative;\n  font-size: 2rem;\n}\n\n#board_container > * > .board {\n  display: grid;\n  grid-template-columns: repeat(10, 2em);\n  grid-auto-rows: 2em;\n}\n\n#board_container > *:not(.wait) > .board > .cell > .cell_content > .ship {\n  background-color: transparent;\n}\n\n.player_two > .game_start {\n  display: none;\n}\n\n.game_start > button {\n  width: 150px;\n  height: 150px;\n  font-size: 4rem;\n}\n\n.cell {\n  /* width: 16px;\n  height: 16px; */\n  background-color: white;\n  border: 0.5px solid black;\n  position: relative;\n  cursor: pointer;\n}\n\n.cell > * {\n  pointer-events: none;\n}\n\n.cell > .cell_content {\n  height: 100%;\n}\n\n.cell > .cell_content > .ship {\n  /*\n  Show ship during placing ships phase\n  Show only active player's ship when game is in play\n  */\n  height: inherit;\n  background-color: cornflowerblue;\n}\n\n#board_container > * .board > .cell.hit > .cell_content > .ship {\n  background-color: red;\n}\n\n#board_container > * > .board > .cell.miss {\n  background-color: grey;\n}\n\n.cell > .row_marker {\n  position: absolute;\n  height: 100%;\n  display: flex;\n  left: -2em;\n  top: 0;\n  align-items: center;\n}\n\n.cell > .col_marker {\n  position: absolute;\n  top: -2em;\n  text-align: center;\n  width: 100%;\n}\n"],"sourceRoot":""}]);
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
  {
    element: 'h2',
    attributes: {
      textContent: 'Battleship',
    },
  },
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
  // init() {
  //   pubSub.publish('notify', 'Place ships');
  //   this.start = this.start.bind(this);
  //   this.renderShip = this.renderShip.bind(this);
  // },
  renderShip(element) {
    // This will append to the content div
    console.log(element);
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
  boardHandler(e) {
    const btn = e.target;
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);
    if (!isNaN(x) || !isNaN(y)) {
      // Place ship
      console.log(`Placing a ship starting at [${x}, ${y}]`);
      this.game.playerOneBoard.placeShip([2, 2], 3, false);
      this.game.playerTwoBoard.placeShip([6, 2], 3, false);
      this.renderShip(btn);
    }
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
  unbindEvents() {
    this.playerOneBoard.removeEventListener('click', this.boardHandler);
    this.playerTwoBoard.removeEventListener('click', this.boardHandler);
  },
  renderAttack(cell, coordinate) {
    // Find button on this.game.activePlayer's board
    // for which it's dataset.x === x and dataset.y === y

    console.log(cell);
    console.log(coordinate);

    if (this.game.activePlayer === this.game.playerOne) {
      console.log(this.playerTwoBoard);
      console.log(this.playerTwoBoard.children);
    } else {
      console.log(this.playerOneBoard);
      console.log(this.playerOneBoard.children);
    }
    // if (cell.miss) {
    //   // Mark as miss
    //   btn.classList.add('miss');
    // } else {
    //   // Mark as hit
    //   btn.classList.add('hit');
    // }
    // Adds a class to the btn, miss or hit
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
  },
  renderGameOver(message) {
    _containers_pubSub__WEBPACK_IMPORTED_MODULE_0__["default"].publish('notify', message);
    console.log(`game is over`);
  },
  boardHandler(e) {
    const btn = e.target;
    const x = parseInt(btn.dataset.x);
    const y = parseInt(btn.dataset.y);
    if (!isNaN(x) || !isNaN(y)) {
      const cell = this.game.activePlayer.opponentBoard.getBoardCell([x, y]);
      if (cell.miss === false || cell.hit === false) {
        this.game.playRound([x, y]);
        // this.renderAttack(btn, cell);
        const gameStatus = this.game.getGameStatus();
        if (gameStatus.status) {
          // Game is over
          this.unbindEvents();
          this.renderGameOver(gameStatus.message);
        } else {
          this.renderWait();
        }
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
/* harmony import */ var _styles_screenController_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../styles/screenController.css */ "./src/styles/screenController.css");







// Trying to decide whether or not it is a good idea to create a separate module
// to control the screen after players have placed all their ships
// and after a 'start' button is clicked
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mode) => {
  // Builds empty board for players to place their ships
  // mode === true => human vs human
  // mode === false => human vs computer

  const screenController = {
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
    },
    bindEvents() {
      if (!this.gameReady) this.startBtn.addEventListener('click', this.start);
      if (this.gameReady) {
        this.updateGameState(_playGame__WEBPACK_IMPORTED_MODULE_4__["default"]);
        this.renderAttack = this.renderAttack.bind(this);
        _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].subscribe('renderAttack', this.renderAttack);
      }
      this.boardHandler = this.boardHandler.bind(this);
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
              cellBtn.appendChild(rowMarker);
            }
            if (y === 0) {
              colMarker.setAttributes({
                class: 'col_marker',
                textContent: `${String.fromCharCode(65 + x)}`,
              });
              cellBtn.appendChild(colMarker);
            }
          }
          playerBoard.appendChild(cellBtn);
        });
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
  let activePlayer;
  const playerOneBoard = (0,_gameboard__WEBPACK_IMPORTED_MODULE_0__["default"])();
  const playerTwoBoard = (0,_gameboard__WEBPACK_IMPORTED_MODULE_0__["default"])();

  const playerOne = (0,_pipe__WEBPACK_IMPORTED_MODULE_2__["default"])(_player__WEBPACK_IMPORTED_MODULE_1__["default"], _isHuman__WEBPACK_IMPORTED_MODULE_3__["default"])(playerOneBoard, playerTwoBoard);
  const playerTwo = (0,_pipe__WEBPACK_IMPORTED_MODULE_2__["default"])(_player__WEBPACK_IMPORTED_MODULE_1__["default"], mode ? _isHuman__WEBPACK_IMPORTED_MODULE_3__["default"] : _isComputer__WEBPACK_IMPORTED_MODULE_4__["default"])(playerTwoBoard, playerOneBoard);

  const switchPlayers = (player) => {
    if (player) {
      // Looking into Lodash _.isEqual()
      // Could add a turn property to player object that takes a boolean
      activePlayer = player === playerOne ? playerTwo : playerOne;
    } else {
      // Initially set a random player as the active player
      const players = [playerOne, playerTwo];
      activePlayer = players[Math.floor(Math.random() * 2)];
    }

    // If activePlayer is a computer...
    // Do something different here?
    // Call playRound()?
  };

  const playRound = (coordinate) => {
    // Allow a player to attack again if the initial attack hits a ship
    activePlayer.attack(coordinate);
    // If game is not over, switch players
    if (!getGameStatus().status) switchPlayers(activePlayer);
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

  switchPlayers();
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

  const checkBoard = ([x, y]) => {
    // Check if there is a ship at x and y
    // Check if all surrounding coordinates are undefined
    // Return true if ship can be place
    const boolean = validateCoordinate(x, y);
    const check = [
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
      return validateCoordinate(a, b) ? boolean && board[a][b].ship === undefined : boolean;
    });
  };

  const placeShip = (coordinates, shipLength, orientation) => {
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
    // const x = board.length - coordinates[1];
    // const y = coordinates[0] - 1;
    const [x, y] = parseCoordinate(coordinates);
    const newShip = (0,_containers_ship__WEBPACK_IMPORTED_MODULE_0__["default"])(shipLength);
    const shipCoordinates = generateShipCoordinates([x, y], orientation, newShip.length);
    if (shipCoordinates.every(checkBoard)) {
      // Check if x and y are within the board's size
      // Check if there is a ship at x and y
      if (orientation) {
        // Vertical
        for (let i = x; i < x + newShip.length; i += 1) {
          board[i][y] = Cell(newShip);
        }
      } else {
        // Horizontal
        // board[x].fill(newShip, y, y + newShip.length);
        for (let i = y; i < y + newShip.length; i += 1) {
          board[x][i] = Cell(newShip);
        }
      }
    } else {
      throw new Error('There is a ship at or near coordinates');
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
      console.log([x, y]);
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

    // console.log(this.subscribers[subscriber]);
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
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((shipLength) => {
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
const BuildElement = (state) => ({
  setAttributes: (attributes) => {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'textContent') {
        if (key === 'class') {
          state.setClassName(value.split(/\s/));
        } else {
          state.setAttribute(key, value);
        }
      } else {
        state.setTextContent(value);
      }
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsbUJBQW1CO0FBQzVFOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsa0JBQWtCO0FBQ2pDLGVBQWUsUUFBUTtBQUN2QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVB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QUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsQ0FBQyxFQUFDOzs7Ozs7Ozs7Ozs7Ozs7O0FDbkNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNIO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7QUFDSCxDQUFDOztBQUVjO0FBQ2Y7O0FBRUE7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvQGljb25mdS9zdmctaW5qZWN0L2Rpc3Qvc3ZnLWluamVjdC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbmF2YmFyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9hcHAuY3NzP2E2NzIiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbmF2YmFyLmNzcz9jMWRiIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzPzM0MWUiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2FwcC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL2hlYWRlci5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9oZWFkZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9uYXZiYXIvbmF2YmFyLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25hdmJhci9uYXZiYXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hlYWRlci9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2hvbWUvaG9tZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvbWFpbi9tYWluLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvbWFpbi9tYWluLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vY29tcG9zZUdhbWUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3NjcmVlbi9wbGF5R2FtZS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvc2NyZWVuL3NjcmVlbkNvbnRyb2xsZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2dhbWVDb250cm9sbGVyLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9nYW1lYm9hcmQuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2lzQ29tcHV0ZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL2lzSHVtYW4uanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3BpcGUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3BsYXllci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvcHViU3ViLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9zaGlwLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvaGVscGVycy9jcmVhdGVFbGVtZW50LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU1ZHSW5qZWN0IC0gVmVyc2lvbiAxLjIuM1xuICogQSB0aW55LCBpbnR1aXRpdmUsIHJvYnVzdCwgY2FjaGluZyBzb2x1dGlvbiBmb3IgaW5qZWN0aW5nIFNWRyBmaWxlcyBpbmxpbmUgaW50byB0aGUgRE9NLlxuICpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9pY29uZnUvc3ZnLWluamVjdFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxOCBJTkNPUlMsIHRoZSBjcmVhdG9ycyBvZiBpY29uZnUuY29tXG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9pY29uZnUvc3ZnLWluamVjdC9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKi9cblxuKGZ1bmN0aW9uKHdpbmRvdywgZG9jdW1lbnQpIHtcbiAgLy8gY29uc3RhbnRzIGZvciBiZXR0ZXIgbWluaWZpY2F0aW9uXG4gIHZhciBfQ1JFQVRFX0VMRU1FTlRfID0gJ2NyZWF0ZUVsZW1lbnQnO1xuICB2YXIgX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV8gPSAnZ2V0RWxlbWVudHNCeVRhZ05hbWUnO1xuICB2YXIgX0xFTkdUSF8gPSAnbGVuZ3RoJztcbiAgdmFyIF9TVFlMRV8gPSAnc3R5bGUnO1xuICB2YXIgX1RJVExFXyA9ICd0aXRsZSc7XG4gIHZhciBfVU5ERUZJTkVEXyA9ICd1bmRlZmluZWQnO1xuICB2YXIgX1NFVF9BVFRSSUJVVEVfID0gJ3NldEF0dHJpYnV0ZSc7XG4gIHZhciBfR0VUX0FUVFJJQlVURV8gPSAnZ2V0QXR0cmlidXRlJztcblxuICB2YXIgTlVMTCA9IG51bGw7XG5cbiAgLy8gY29uc3RhbnRzXG4gIHZhciBfX1NWR0lOSkVDVCA9ICdfX3N2Z0luamVjdCc7XG4gIHZhciBJRF9TVUZGSVggPSAnLS1pbmplY3QtJztcbiAgdmFyIElEX1NVRkZJWF9SRUdFWCA9IG5ldyBSZWdFeHAoSURfU1VGRklYICsgJ1xcXFxkKycsIFwiZ1wiKTtcbiAgdmFyIExPQURfRkFJTCA9ICdMT0FEX0ZBSUwnO1xuICB2YXIgU1ZHX05PVF9TVVBQT1JURUQgPSAnU1ZHX05PVF9TVVBQT1JURUQnO1xuICB2YXIgU1ZHX0lOVkFMSUQgPSAnU1ZHX0lOVkFMSUQnO1xuICB2YXIgQVRUUklCVVRFX0VYQ0xVU0lPTl9OQU1FUyA9IFsnc3JjJywgJ2FsdCcsICdvbmxvYWQnLCAnb25lcnJvciddO1xuICB2YXIgQV9FTEVNRU5UID0gZG9jdW1lbnRbX0NSRUFURV9FTEVNRU5UX10oJ2EnKTtcbiAgdmFyIElTX1NWR19TVVBQT1JURUQgPSB0eXBlb2YgU1ZHUmVjdCAhPSBfVU5ERUZJTkVEXztcbiAgdmFyIERFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICB1c2VDYWNoZTogdHJ1ZSxcbiAgICBjb3B5QXR0cmlidXRlczogdHJ1ZSxcbiAgICBtYWtlSWRzVW5pcXVlOiB0cnVlXG4gIH07XG4gIC8vIE1hcCBvZiBJUkkgcmVmZXJlbmNlYWJsZSB0YWcgbmFtZXMgdG8gcHJvcGVydGllcyB0aGF0IGNhbiByZWZlcmVuY2UgdGhlbS4gVGhpcyBpcyBkZWZpbmVkIGluXG4gIC8vIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9saW5raW5nLmh0bWwjcHJvY2Vzc2luZ0lSSVxuICB2YXIgSVJJX1RBR19QUk9QRVJUSUVTX01BUCA9IHtcbiAgICBjbGlwUGF0aDogWydjbGlwLXBhdGgnXSxcbiAgICAnY29sb3ItcHJvZmlsZSc6IE5VTEwsXG4gICAgY3Vyc29yOiBOVUxMLFxuICAgIGZpbHRlcjogTlVMTCxcbiAgICBsaW5lYXJHcmFkaWVudDogWydmaWxsJywgJ3N0cm9rZSddLFxuICAgIG1hcmtlcjogWydtYXJrZXInLCAnbWFya2VyLWVuZCcsICdtYXJrZXItbWlkJywgJ21hcmtlci1zdGFydCddLFxuICAgIG1hc2s6IE5VTEwsXG4gICAgcGF0dGVybjogWydmaWxsJywgJ3N0cm9rZSddLFxuICAgIHJhZGlhbEdyYWRpZW50OiBbJ2ZpbGwnLCAnc3Ryb2tlJ11cbiAgfTtcbiAgdmFyIElOSkVDVEVEID0gMTtcbiAgdmFyIEZBSUwgPSAyO1xuXG4gIHZhciB1bmlxdWVJZENvdW50ZXIgPSAxO1xuICB2YXIgeG1sU2VyaWFsaXplcjtcbiAgdmFyIGRvbVBhcnNlcjtcblxuXG4gIC8vIGNyZWF0ZXMgYW4gU1ZHIGRvY3VtZW50IGZyb20gYW4gU1ZHIHN0cmluZ1xuICBmdW5jdGlvbiBzdmdTdHJpbmdUb1N2Z0RvYyhzdmdTdHIpIHtcbiAgICBkb21QYXJzZXIgPSBkb21QYXJzZXIgfHwgbmV3IERPTVBhcnNlcigpO1xuICAgIHJldHVybiBkb21QYXJzZXIucGFyc2VGcm9tU3RyaW5nKHN2Z1N0ciwgJ3RleHQveG1sJyk7XG4gIH1cblxuXG4gIC8vIHNlYXJpYWxpemVzIGFuIFNWRyBlbGVtZW50IHRvIGFuIFNWRyBzdHJpbmdcbiAgZnVuY3Rpb24gc3ZnRWxlbVRvU3ZnU3RyaW5nKHN2Z0VsZW1lbnQpIHtcbiAgICB4bWxTZXJpYWxpemVyID0geG1sU2VyaWFsaXplciB8fCBuZXcgWE1MU2VyaWFsaXplcigpO1xuICAgIHJldHVybiB4bWxTZXJpYWxpemVyLnNlcmlhbGl6ZVRvU3RyaW5nKHN2Z0VsZW1lbnQpO1xuICB9XG5cblxuICAvLyBSZXR1cm5zIHRoZSBhYnNvbHV0ZSB1cmwgZm9yIHRoZSBzcGVjaWZpZWQgdXJsXG4gIGZ1bmN0aW9uIGdldEFic29sdXRlVXJsKHVybCkge1xuICAgIEFfRUxFTUVOVC5ocmVmID0gdXJsO1xuICAgIHJldHVybiBBX0VMRU1FTlQuaHJlZjtcbiAgfVxuXG5cbiAgLy8gTG9hZCBzdmcgd2l0aCBhbiBYSFIgcmVxdWVzdFxuICBmdW5jdGlvbiBsb2FkU3ZnKHVybCwgY2FsbGJhY2ssIGVycm9yQ2FsbGJhY2spIHtcbiAgICBpZiAodXJsKSB7XG4gICAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgLy8gcmVhZHlTdGF0ZSBpcyBET05FXG4gICAgICAgICAgdmFyIHN0YXR1cyA9IHJlcS5zdGF0dXM7XG4gICAgICAgICAgaWYgKHN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgIC8vIHJlcXVlc3Qgc3RhdHVzIGlzIE9LXG4gICAgICAgICAgICBjYWxsYmFjayhyZXEucmVzcG9uc2VYTUwsIHJlcS5yZXNwb25zZVRleHQudHJpbSgpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgIC8vIHJlcXVlc3Qgc3RhdHVzIGlzIGVycm9yICg0eHggb3IgNXh4KVxuICAgICAgICAgICAgZXJyb3JDYWxsYmFjaygpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID09IDApIHtcbiAgICAgICAgICAgIC8vIHJlcXVlc3Qgc3RhdHVzIDAgY2FuIGluZGljYXRlIGEgZmFpbGVkIGNyb3NzLWRvbWFpbiBjYWxsXG4gICAgICAgICAgICBlcnJvckNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmVxLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgICByZXEuc2VuZCgpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gQ29weSBhdHRyaWJ1dGVzIGZyb20gaW1nIGVsZW1lbnQgdG8gc3ZnIGVsZW1lbnRcbiAgZnVuY3Rpb24gY29weUF0dHJpYnV0ZXMoaW1nRWxlbSwgc3ZnRWxlbSkge1xuICAgIHZhciBhdHRyaWJ1dGU7XG4gICAgdmFyIGF0dHJpYnV0ZU5hbWU7XG4gICAgdmFyIGF0dHJpYnV0ZVZhbHVlO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gaW1nRWxlbS5hdHRyaWJ1dGVzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXR0cmlidXRlc1tfTEVOR1RIX107IGkrKykge1xuICAgICAgYXR0cmlidXRlID0gYXR0cmlidXRlc1tpXTtcbiAgICAgIGF0dHJpYnV0ZU5hbWUgPSBhdHRyaWJ1dGUubmFtZTtcbiAgICAgIC8vIE9ubHkgY29weSBhdHRyaWJ1dGVzIG5vdCBleHBsaWNpdGx5IGV4Y2x1ZGVkIGZyb20gY29weWluZ1xuICAgICAgaWYgKEFUVFJJQlVURV9FWENMVVNJT05fTkFNRVMuaW5kZXhPZihhdHRyaWJ1dGVOYW1lKSA9PSAtMSkge1xuICAgICAgICBhdHRyaWJ1dGVWYWx1ZSA9IGF0dHJpYnV0ZS52YWx1ZTtcbiAgICAgICAgLy8gSWYgaW1nIGF0dHJpYnV0ZSBpcyBcInRpdGxlXCIsIGluc2VydCBhIHRpdGxlIGVsZW1lbnQgaW50byBTVkcgZWxlbWVudFxuICAgICAgICBpZiAoYXR0cmlidXRlTmFtZSA9PSBfVElUTEVfKSB7XG4gICAgICAgICAgdmFyIHRpdGxlRWxlbTtcbiAgICAgICAgICB2YXIgZmlyc3RFbGVtZW50Q2hpbGQgPSBzdmdFbGVtLmZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgIGlmIChmaXJzdEVsZW1lbnRDaGlsZCAmJiBmaXJzdEVsZW1lbnRDaGlsZC5sb2NhbE5hbWUudG9Mb3dlckNhc2UoKSA9PSBfVElUTEVfKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgU1ZHIGVsZW1lbnQncyBmaXJzdCBjaGlsZCBpcyBhIHRpdGxlIGVsZW1lbnQsIGtlZXAgaXQgYXMgdGhlIHRpdGxlIGVsZW1lbnRcbiAgICAgICAgICAgIHRpdGxlRWxlbSA9IGZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgU1ZHIGVsZW1lbnQncyBmaXJzdCBjaGlsZCBlbGVtZW50IGlzIG5vdCBhIHRpdGxlIGVsZW1lbnQsIGNyZWF0ZSBhIG5ldyB0aXRsZVxuICAgICAgICAgICAgLy8gZWxlLGVtdCBhbmQgc2V0IGl0IGFzIHRoZSBmaXJzdCBjaGlsZFxuICAgICAgICAgICAgdGl0bGVFbGVtID0gZG9jdW1lbnRbX0NSRUFURV9FTEVNRU5UXyArICdOUyddKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIF9USVRMRV8pO1xuICAgICAgICAgICAgc3ZnRWxlbS5pbnNlcnRCZWZvcmUodGl0bGVFbGVtLCBmaXJzdEVsZW1lbnRDaGlsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNldCBuZXcgdGl0bGUgY29udGVudFxuICAgICAgICAgIHRpdGxlRWxlbS50ZXh0Q29udGVudCA9IGF0dHJpYnV0ZVZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFNldCBpbWcgYXR0cmlidXRlIHRvIHN2ZyBlbGVtZW50XG4gICAgICAgICAgc3ZnRWxlbVtfU0VUX0FUVFJJQlVURV9dKGF0dHJpYnV0ZU5hbWUsIGF0dHJpYnV0ZVZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBhcHBlbmRzIGEgc3VmZml4IHRvIElEcyBvZiByZWZlcmVuY2VkIGVsZW1lbnRzIGluIHRoZSA8ZGVmcz4gaW4gb3JkZXIgdG8gIHRvIGF2b2lkIElEIGNvbGxpc2lvblxuICAvLyBiZXR3ZWVuIG11bHRpcGxlIGluamVjdGVkIFNWR3MuIFRoZSBzdWZmaXggaGFzIHRoZSBmb3JtIFwiLS1pbmplY3QtWFwiLCB3aGVyZSBYIGlzIGEgcnVubmluZyBudW1iZXIgd2hpY2ggaXNcbiAgLy8gaW5jcmVtZW50ZWQgd2l0aCBlYWNoIGluamVjdGlvbi4gUmVmZXJlbmNlcyB0byB0aGUgSURzIGFyZSBhZGp1c3RlZCBhY2NvcmRpbmdseS5cbiAgLy8gV2UgYXNzdW1lIHRoYSBhbGwgSURzIHdpdGhpbiB0aGUgaW5qZWN0ZWQgU1ZHIGFyZSB1bmlxdWUsIHRoZXJlZm9yZSB0aGUgc2FtZSBzdWZmaXggY2FuIGJlIHVzZWQgZm9yIGFsbCBJRHMgb2Ygb25lXG4gIC8vIGluamVjdGVkIFNWRy5cbiAgLy8gSWYgdGhlIG9ubHlSZWZlcmVuY2VkIGFyZ3VtZW50IGlzIHNldCB0byB0cnVlLCBvbmx5IHRob3NlIElEcyB3aWxsIGJlIG1hZGUgdW5pcXVlIHRoYXQgYXJlIHJlZmVyZW5jZWQgZnJvbSB3aXRoaW4gdGhlIFNWR1xuICBmdW5jdGlvbiBtYWtlSWRzVW5pcXVlKHN2Z0VsZW0sIG9ubHlSZWZlcmVuY2VkKSB7XG4gICAgdmFyIGlkU3VmZml4ID0gSURfU1VGRklYICsgdW5pcXVlSWRDb3VudGVyKys7XG4gICAgLy8gUmVndWxhciBleHByZXNzaW9uIGZvciBmdW5jdGlvbmFsIG5vdGF0aW9ucyBvZiBhbiBJUkkgcmVmZXJlbmNlcy4gVGhpcyB3aWxsIGZpbmQgb2NjdXJlbmNlcyBpbiB0aGUgZm9ybVxuICAgIC8vIHVybCgjYW55SWQpIG9yIHVybChcIiNhbnlJZFwiKSAoZm9yIEludGVybmV0IEV4cGxvcmVyKSBhbmQgY2FwdHVyZSB0aGUgcmVmZXJlbmNlZCBJRFxuICAgIHZhciBmdW5jSXJpUmVnZXggPSAvdXJsXFwoXCI/IyhbYS16QS1aXVtcXHc6Li1dKilcIj9cXCkvZztcbiAgICAvLyBHZXQgYWxsIGVsZW1lbnRzIHdpdGggYW4gSUQuIFRoZSBTVkcgc3BlYyByZWNvbW1lbmRzIHRvIHB1dCByZWZlcmVuY2VkIGVsZW1lbnRzIGluc2lkZSA8ZGVmcz4gZWxlbWVudHMsIGJ1dFxuICAgIC8vIHRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQsIHRoZXJlZm9yZSB3ZSBoYXZlIHRvIHNlYXJjaCBmb3IgSURzIGluIHRoZSB3aG9sZSBTVkcuXG4gICAgdmFyIGlkRWxlbWVudHMgPSBzdmdFbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tpZF0nKTtcbiAgICB2YXIgaWRFbGVtO1xuICAgIC8vIEFuIG9iamVjdCBjb250YWluaW5nIHJlZmVyZW5jZWQgSURzICBhcyBrZXlzIGlzIHVzZWQgaWYgb25seSByZWZlcmVuY2VkIElEcyBzaG91bGQgYmUgdW5pcXVpZmllZC5cbiAgICAvLyBJZiB0aGlzIG9iamVjdCBkb2VzIG5vdCBleGlzdCwgYWxsIElEcyB3aWxsIGJlIHVuaXF1aWZpZWQuXG4gICAgdmFyIHJlZmVyZW5jZWRJZHMgPSBvbmx5UmVmZXJlbmNlZCA/IFtdIDogTlVMTDtcbiAgICB2YXIgdGFnTmFtZTtcbiAgICB2YXIgaXJpVGFnTmFtZXMgPSB7fTtcbiAgICB2YXIgaXJpUHJvcGVydGllcyA9IFtdO1xuICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgdmFyIGksIGo7XG5cbiAgICBpZiAoaWRFbGVtZW50c1tfTEVOR1RIX10pIHtcbiAgICAgIC8vIE1ha2UgYWxsIElEcyB1bmlxdWUgYnkgYWRkaW5nIHRoZSBJRCBzdWZmaXggYW5kIGNvbGxlY3QgYWxsIGVuY291bnRlcmVkIHRhZyBuYW1lc1xuICAgICAgLy8gdGhhdCBhcmUgSVJJIHJlZmVyZW5jZWFibGUgZnJvbSBwcm9wZXJpdGllcy5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpZEVsZW1lbnRzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICAgIHRhZ05hbWUgPSBpZEVsZW1lbnRzW2ldLmxvY2FsTmFtZTsgLy8gVXNlIG5vbi1uYW1lc3BhY2VkIHRhZyBuYW1lXG4gICAgICAgIC8vIE1ha2UgSUQgdW5pcXVlIGlmIHRhZyBuYW1lIGlzIElSSSByZWZlcmVuY2VhYmxlXG4gICAgICAgIGlmICh0YWdOYW1lIGluIElSSV9UQUdfUFJPUEVSVElFU19NQVApIHtcbiAgICAgICAgICBpcmlUYWdOYW1lc1t0YWdOYW1lXSA9IDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEdldCBhbGwgcHJvcGVydGllcyB0aGF0IGFyZSBtYXBwZWQgdG8gdGhlIGZvdW5kIElSSSByZWZlcmVuY2VhYmxlIHRhZ3NcbiAgICAgIGZvciAodGFnTmFtZSBpbiBpcmlUYWdOYW1lcykge1xuICAgICAgICAoSVJJX1RBR19QUk9QRVJUSUVTX01BUFt0YWdOYW1lXSB8fCBbdGFnTmFtZV0pLmZvckVhY2goZnVuY3Rpb24gKG1hcHBlZFByb3BlcnR5KSB7XG4gICAgICAgICAgLy8gQWRkIG1hcHBlZCBwcm9wZXJ0aWVzIHRvIGFycmF5IG9mIGlyaSByZWZlcmVuY2luZyBwcm9wZXJ0aWVzLlxuICAgICAgICAgIC8vIFVzZSBsaW5lYXIgc2VhcmNoIGhlcmUgYmVjYXVzZSB0aGUgbnVtYmVyIG9mIHBvc3NpYmxlIGVudHJpZXMgaXMgdmVyeSBzbWFsbCAobWF4aW11bSAxMSlcbiAgICAgICAgICBpZiAoaXJpUHJvcGVydGllcy5pbmRleE9mKG1hcHBlZFByb3BlcnR5KSA8IDApIHtcbiAgICAgICAgICAgIGlyaVByb3BlcnRpZXMucHVzaChtYXBwZWRQcm9wZXJ0eSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChpcmlQcm9wZXJ0aWVzW19MRU5HVEhfXSkge1xuICAgICAgICAvLyBBZGQgXCJzdHlsZVwiIHRvIHByb3BlcnRpZXMsIGJlY2F1c2UgaXQgbWF5IGNvbnRhaW4gcmVmZXJlbmNlcyBpbiB0aGUgZm9ybSAnc3R5bGU9XCJmaWxsOnVybCgjbXlGaWxsKVwiJ1xuICAgICAgICBpcmlQcm9wZXJ0aWVzLnB1c2goX1NUWUxFXyk7XG4gICAgICB9XG4gICAgICAvLyBSdW4gdGhyb3VnaCBhbGwgZWxlbWVudHMgb2YgdGhlIFNWRyBhbmQgcmVwbGFjZSBJRHMgaW4gcmVmZXJlbmNlcy5cbiAgICAgIC8vIFRvIGdldCBhbGwgZGVzY2VuZGluZyBlbGVtZW50cywgZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKSBzZWVtcyB0byBwZXJmb3JtIGZhc3RlciB0aGFuIHF1ZXJ5U2VsZWN0b3JBbGwoJyonKS5cbiAgICAgIC8vIFNpbmNlIHN2Z0VsZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKSBkb2VzIG5vdCByZXR1cm4gdGhlIHN2ZyBlbGVtZW50IGl0c2VsZiwgd2UgaGF2ZSB0byBoYW5kbGUgaXQgc2VwYXJhdGVseS5cbiAgICAgIHZhciBkZXNjRWxlbWVudHMgPSBzdmdFbGVtW19HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfXSgnKicpO1xuICAgICAgdmFyIGVsZW1lbnQgPSBzdmdFbGVtO1xuICAgICAgdmFyIHByb3BlcnR5TmFtZTtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIHZhciBuZXdWYWx1ZTtcbiAgICAgIGZvciAoaSA9IC0xOyBlbGVtZW50ICE9IE5VTEw7KSB7XG4gICAgICAgIGlmIChlbGVtZW50LmxvY2FsTmFtZSA9PSBfU1RZTEVfKSB7XG4gICAgICAgICAgLy8gSWYgZWxlbWVudCBpcyBhIHN0eWxlIGVsZW1lbnQsIHJlcGxhY2UgSURzIGluIGFsbCBvY2N1cmVuY2VzIG9mIFwidXJsKCNhbnlJZClcIiBpbiB0ZXh0IGNvbnRlbnRcbiAgICAgICAgICB2YWx1ZSA9IGVsZW1lbnQudGV4dENvbnRlbnQ7XG4gICAgICAgICAgbmV3VmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS5yZXBsYWNlKGZ1bmNJcmlSZWdleCwgZnVuY3Rpb24obWF0Y2gsIGlkKSB7XG4gICAgICAgICAgICBpZiAocmVmZXJlbmNlZElkcykge1xuICAgICAgICAgICAgICByZWZlcmVuY2VkSWRzW2lkXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJ3VybCgjJyArIGlkICsgaWRTdWZmaXggKyAnKSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgZWxlbWVudC50ZXh0Q29udGVudCA9IG5ld1ZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICAgIC8vIFJ1biB0aHJvdWdoIGFsbCBwcm9wZXJ0eSBuYW1lcyBmb3Igd2hpY2ggSURzIHdlcmUgZm91bmRcbiAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgaXJpUHJvcGVydGllc1tfTEVOR1RIX107IGorKykge1xuICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gaXJpUHJvcGVydGllc1tqXTtcbiAgICAgICAgICAgIHZhbHVlID0gZWxlbWVudFtfR0VUX0FUVFJJQlVURV9dKHByb3BlcnR5TmFtZSk7XG4gICAgICAgICAgICBuZXdWYWx1ZSA9IHZhbHVlICYmIHZhbHVlLnJlcGxhY2UoZnVuY0lyaVJlZ2V4LCBmdW5jdGlvbihtYXRjaCwgaWQpIHtcbiAgICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VkSWRzW2lkXSA9IDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJ3VybCgjJyArIGlkICsgaWRTdWZmaXggKyAnKSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgZWxlbWVudFtfU0VUX0FUVFJJQlVURV9dKHByb3BlcnR5TmFtZSwgbmV3VmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXBsYWNlIElEcyBpbiB4bGluazpyZWYgYW5kIGhyZWYgYXR0cmlidXRlc1xuICAgICAgICAgIFsneGxpbms6aHJlZicsICdocmVmJ10uZm9yRWFjaChmdW5jdGlvbihyZWZBdHRyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGlyaSA9IGVsZW1lbnRbX0dFVF9BVFRSSUJVVEVfXShyZWZBdHRyTmFtZSk7XG4gICAgICAgICAgICBpZiAoL15cXHMqIy8udGVzdChpcmkpKSB7IC8vIENoZWNrIGlmIGlyaSBpcyBub24tbnVsbCBhbmQgaW50ZXJuYWwgcmVmZXJlbmNlXG4gICAgICAgICAgICAgIGlyaSA9IGlyaS50cmltKCk7XG4gICAgICAgICAgICAgIGVsZW1lbnRbX1NFVF9BVFRSSUJVVEVfXShyZWZBdHRyTmFtZSwgaXJpICsgaWRTdWZmaXgpO1xuICAgICAgICAgICAgICBpZiAocmVmZXJlbmNlZElkcykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBJRCB0byByZWZlcmVuY2VkIElEc1xuICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRJZHNbaXJpLnN1YnN0cmluZygxKV0gPSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudCA9IGRlc2NFbGVtZW50c1srK2ldO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IGlkRWxlbWVudHNbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgICAgaWRFbGVtID0gaWRFbGVtZW50c1tpXTtcbiAgICAgICAgLy8gSWYgc2V0IG9mIHJlZmVyZW5jZWQgSURzIGV4aXN0cywgbWFrZSBvbmx5IHJlZmVyZW5jZWQgSURzIHVuaXF1ZSxcbiAgICAgICAgLy8gb3RoZXJ3aXNlIG1ha2UgYWxsIElEcyB1bmlxdWUuXG4gICAgICAgIGlmICghcmVmZXJlbmNlZElkcyB8fCByZWZlcmVuY2VkSWRzW2lkRWxlbS5pZF0pIHtcbiAgICAgICAgICAvLyBBZGQgc3VmZml4IHRvIGVsZW1lbnQncyBJRFxuICAgICAgICAgIGlkRWxlbS5pZCArPSBpZFN1ZmZpeDtcbiAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBTVkcgZWxlbWVudCBoYXMgY2hhbmdlZFxuICAgIHJldHVybiBjaGFuZ2VkO1xuICB9XG5cblxuICAvLyBGb3IgY2FjaGVkIFNWR3MgdGhlIElEcyBhcmUgbWFkZSB1bmlxdWUgYnkgc2ltcGx5IHJlcGxhY2luZyB0aGUgYWxyZWFkeSBpbnNlcnRlZCB1bmlxdWUgSURzIHdpdGggYVxuICAvLyBoaWdoZXIgSUQgY291bnRlci4gVGhpcyBpcyBtdWNoIG1vcmUgcGVyZm9ybWFudCB0aGFuIGEgY2FsbCB0byBtYWtlSWRzVW5pcXVlKCkuXG4gIGZ1bmN0aW9uIG1ha2VJZHNVbmlxdWVDYWNoZWQoc3ZnU3RyaW5nKSB7XG4gICAgcmV0dXJuIHN2Z1N0cmluZy5yZXBsYWNlKElEX1NVRkZJWF9SRUdFWCwgSURfU1VGRklYICsgdW5pcXVlSWRDb3VudGVyKyspO1xuICB9XG5cblxuICAvLyBJbmplY3QgU1ZHIGJ5IHJlcGxhY2luZyB0aGUgaW1nIGVsZW1lbnQgd2l0aCB0aGUgU1ZHIGVsZW1lbnQgaW4gdGhlIERPTVxuICBmdW5jdGlvbiBpbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSwgYWJzVXJsLCBvcHRpb25zKSB7XG4gICAgaWYgKHN2Z0VsZW0pIHtcbiAgICAgIHN2Z0VsZW1bX1NFVF9BVFRSSUJVVEVfXSgnZGF0YS1pbmplY3QtdXJsJywgYWJzVXJsKTtcbiAgICAgIHZhciBwYXJlbnROb2RlID0gaW1nRWxlbS5wYXJlbnROb2RlO1xuICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuY29weUF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICBjb3B5QXR0cmlidXRlcyhpbWdFbGVtLCBzdmdFbGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbnZva2UgYmVmb3JlSW5qZWN0IGhvb2sgaWYgc2V0XG4gICAgICAgIHZhciBiZWZvcmVJbmplY3QgPSBvcHRpb25zLmJlZm9yZUluamVjdDtcbiAgICAgICAgdmFyIGluamVjdEVsZW0gPSAoYmVmb3JlSW5qZWN0ICYmIGJlZm9yZUluamVjdChpbWdFbGVtLCBzdmdFbGVtKSkgfHwgc3ZnRWxlbTtcbiAgICAgICAgLy8gUmVwbGFjZSBpbWcgZWxlbWVudCB3aXRoIG5ldyBlbGVtZW50LiBUaGlzIGlzIHRoZSBhY3R1YWwgaW5qZWN0aW9uLlxuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChpbmplY3RFbGVtLCBpbWdFbGVtKTtcbiAgICAgICAgLy8gTWFyayBpbWcgZWxlbWVudCBhcyBpbmplY3RlZFxuICAgICAgICBpbWdFbGVtW19fU1ZHSU5KRUNUXSA9IElOSkVDVEVEO1xuICAgICAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSk7XG4gICAgICAgIC8vIEludm9rZSBhZnRlckluamVjdCBob29rIGlmIHNldFxuICAgICAgICB2YXIgYWZ0ZXJJbmplY3QgPSBvcHRpb25zLmFmdGVySW5qZWN0O1xuICAgICAgICBpZiAoYWZ0ZXJJbmplY3QpIHtcbiAgICAgICAgICBhZnRlckluamVjdChpbWdFbGVtLCBpbmplY3RFbGVtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdmdJbnZhbGlkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gTWVyZ2VzIGFueSBudW1iZXIgb2Ygb3B0aW9ucyBvYmplY3RzIGludG8gYSBuZXcgb2JqZWN0XG4gIGZ1bmN0aW9uIG1lcmdlT3B0aW9ucygpIHtcbiAgICB2YXIgbWVyZ2VkT3B0aW9ucyA9IHt9O1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBhbGwgc3BlY2lmaWVkIG9wdGlvbnMgb2JqZWN0cyBhbmQgYWRkIGFsbCBwcm9wZXJ0aWVzIHRvIHRoZSBuZXcgb3B0aW9ucyBvYmplY3RcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3NbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgIHZhciBhcmd1bWVudCA9IGFyZ3NbaV07XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudCkge1xuICAgICAgICAgIGlmIChhcmd1bWVudC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBtZXJnZWRPcHRpb25zW2tleV0gPSBhcmd1bWVudFtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIHJldHVybiBtZXJnZWRPcHRpb25zO1xuICB9XG5cblxuICAvLyBBZGRzIHRoZSBzcGVjaWZpZWQgQ1NTIHRvIHRoZSBkb2N1bWVudCdzIDxoZWFkPiBlbGVtZW50XG4gIGZ1bmN0aW9uIGFkZFN0eWxlVG9IZWFkKGNzcykge1xuICAgIHZhciBoZWFkID0gZG9jdW1lbnRbX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV9dKCdoZWFkJylbMF07XG4gICAgaWYgKGhlYWQpIHtcbiAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF9dKF9TVFlMRV8pO1xuICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gQnVpbGRzIGFuIFNWRyBlbGVtZW50IGZyb20gdGhlIHNwZWNpZmllZCBTVkcgc3RyaW5nXG4gIGZ1bmN0aW9uIGJ1aWxkU3ZnRWxlbWVudChzdmdTdHIsIHZlcmlmeSkge1xuICAgIGlmICh2ZXJpZnkpIHtcbiAgICAgIHZhciBzdmdEb2M7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBQYXJzZSB0aGUgU1ZHIHN0cmluZyB3aXRoIERPTVBhcnNlclxuICAgICAgICBzdmdEb2MgPSBzdmdTdHJpbmdUb1N2Z0RvYyhzdmdTdHIpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBOVUxMO1xuICAgICAgfVxuICAgICAgaWYgKHN2Z0RvY1tfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FX10oJ3BhcnNlcmVycm9yJylbX0xFTkdUSF9dKSB7XG4gICAgICAgIC8vIERPTVBhcnNlciBkb2VzIG5vdCB0aHJvdyBhbiBleGNlcHRpb24sIGJ1dCBpbnN0ZWFkIHB1dHMgcGFyc2VyZXJyb3IgdGFncyBpbiB0aGUgZG9jdW1lbnRcbiAgICAgICAgcmV0dXJuIE5VTEw7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3ZnRG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmlubmVySFRNTCA9IHN2Z1N0cjtcbiAgICAgIHJldHVybiBkaXYuZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgfVxuICB9XG5cblxuICBmdW5jdGlvbiByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSkge1xuICAgIC8vIFJlbW92ZSB0aGUgb25sb2FkIGF0dHJpYnV0ZS4gU2hvdWxkIG9ubHkgYmUgdXNlZCB0byByZW1vdmUgdGhlIHVuc3R5bGVkIGltYWdlIGZsYXNoIHByb3RlY3Rpb24gYW5kXG4gICAgLy8gbWFrZSB0aGUgZWxlbWVudCB2aXNpYmxlLCBub3QgZm9yIHJlbW92aW5nIHRoZSBldmVudCBsaXN0ZW5lci5cbiAgICBpbWdFbGVtLnJlbW92ZUF0dHJpYnV0ZSgnb25sb2FkJyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGVycm9yTWVzc2FnZShtc2cpIHtcbiAgICBjb25zb2xlLmVycm9yKCdTVkdJbmplY3Q6ICcgKyBtc2cpO1xuICB9XG5cblxuICBmdW5jdGlvbiBmYWlsKGltZ0VsZW0sIHN0YXR1cywgb3B0aW9ucykge1xuICAgIGltZ0VsZW1bX19TVkdJTkpFQ1RdID0gRkFJTDtcbiAgICBpZiAob3B0aW9ucy5vbkZhaWwpIHtcbiAgICAgIG9wdGlvbnMub25GYWlsKGltZ0VsZW0sIHN0YXR1cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVycm9yTWVzc2FnZShzdGF0dXMpO1xuICAgIH1cbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKSB7XG4gICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pO1xuICAgIGZhaWwoaW1nRWxlbSwgU1ZHX0lOVkFMSUQsIG9wdGlvbnMpO1xuICB9XG5cblxuICBmdW5jdGlvbiBzdmdOb3RTdXBwb3J0ZWQoaW1nRWxlbSwgb3B0aW9ucykge1xuICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWdFbGVtKTtcbiAgICBmYWlsKGltZ0VsZW0sIFNWR19OT1RfU1VQUE9SVEVELCBvcHRpb25zKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gbG9hZEZhaWwoaW1nRWxlbSwgb3B0aW9ucykge1xuICAgIGZhaWwoaW1nRWxlbSwgTE9BRF9GQUlMLCBvcHRpb25zKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoaW1nRWxlbSkge1xuICAgIGltZ0VsZW0ub25sb2FkID0gTlVMTDtcbiAgICBpbWdFbGVtLm9uZXJyb3IgPSBOVUxMO1xuICB9XG5cblxuICBmdW5jdGlvbiBpbWdOb3RTZXQobXNnKSB7XG4gICAgZXJyb3JNZXNzYWdlKCdubyBpbWcgZWxlbWVudCcpO1xuICB9XG5cblxuICBmdW5jdGlvbiBjcmVhdGVTVkdJbmplY3QoZ2xvYmFsTmFtZSwgb3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IG1lcmdlT3B0aW9ucyhERUZBVUxUX09QVElPTlMsIG9wdGlvbnMpO1xuICAgIHZhciBzdmdMb2FkQ2FjaGUgPSB7fTtcblxuICAgIGlmIChJU19TVkdfU1VQUE9SVEVEKSB7XG4gICAgICAvLyBJZiB0aGUgYnJvd3NlciBzdXBwb3J0cyBTVkcsIGFkZCBhIHNtYWxsIHN0eWxlc2hlZXQgdGhhdCBoaWRlcyB0aGUgPGltZz4gZWxlbWVudHMgdW50aWxcbiAgICAgIC8vIGluamVjdGlvbiBpcyBmaW5pc2hlZC4gVGhpcyBhdm9pZHMgc2hvd2luZyB0aGUgdW5zdHlsZWQgU1ZHcyBiZWZvcmUgc3R5bGUgaXMgYXBwbGllZC5cbiAgICAgIGFkZFN0eWxlVG9IZWFkKCdpbWdbb25sb2FkXj1cIicgKyBnbG9iYWxOYW1lICsgJyhcIl17dmlzaWJpbGl0eTpoaWRkZW47fScpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogU1ZHSW5qZWN0XG4gICAgICpcbiAgICAgKiBJbmplY3RzIHRoZSBTVkcgc3BlY2lmaWVkIGluIHRoZSBgc3JjYCBhdHRyaWJ1dGUgb2YgdGhlIHNwZWNpZmllZCBgaW1nYCBlbGVtZW50IG9yIGFycmF5IG9mIGBpbWdgXG4gICAgICogZWxlbWVudHMuIFJldHVybnMgYSBQcm9taXNlIG9iamVjdCB3aGljaCByZXNvbHZlcyBpZiBhbGwgcGFzc2VkIGluIGBpbWdgIGVsZW1lbnRzIGhhdmUgZWl0aGVyIGJlZW5cbiAgICAgKiBpbmplY3RlZCBvciBmYWlsZWQgdG8gaW5qZWN0IChPbmx5IGlmIGEgZ2xvYmFsIFByb21pc2Ugb2JqZWN0IGlzIGF2YWlsYWJsZSBsaWtlIGluIGFsbCBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgKiBvciB0aHJvdWdoIGEgcG9seWZpbGwpLlxuICAgICAqXG4gICAgICogT3B0aW9uczpcbiAgICAgKiB1c2VDYWNoZTogSWYgc2V0IHRvIGB0cnVlYCB0aGUgU1ZHIHdpbGwgYmUgY2FjaGVkIHVzaW5nIHRoZSBhYnNvbHV0ZSBVUkwuIERlZmF1bHQgdmFsdWUgaXMgYHRydWVgLlxuICAgICAqIGNvcHlBdHRyaWJ1dGVzOiBJZiBzZXQgdG8gYHRydWVgIHRoZSBhdHRyaWJ1dGVzIHdpbGwgYmUgY29waWVkIGZyb20gYGltZ2AgdG8gYHN2Z2AuIERmYXVsdCB2YWx1ZVxuICAgICAqICAgICBpcyBgdHJ1ZWAuXG4gICAgICogbWFrZUlkc1VuaXF1ZTogSWYgc2V0IHRvIGB0cnVlYCB0aGUgSUQgb2YgZWxlbWVudHMgaW4gdGhlIGA8ZGVmcz5gIGVsZW1lbnQgdGhhdCBjYW4gYmUgcmVmZXJlbmNlcyBieVxuICAgICAqICAgICBwcm9wZXJ0eSB2YWx1ZXMgKGZvciBleGFtcGxlICdjbGlwUGF0aCcpIGFyZSBtYWRlIHVuaXF1ZSBieSBhcHBlbmRpbmcgXCItLWluamVjdC1YXCIsIHdoZXJlIFggaXMgYVxuICAgICAqICAgICBydW5uaW5nIG51bWJlciB3aGljaCBpbmNyZWFzZXMgd2l0aCBlYWNoIGluamVjdGlvbi4gVGhpcyBpcyBkb25lIHRvIGF2b2lkIGR1cGxpY2F0ZSBJRHMgaW4gdGhlIERPTS5cbiAgICAgKiBiZWZvcmVMb2FkOiBIb29rIGJlZm9yZSBTVkcgaXMgbG9hZGVkLiBUaGUgYGltZ2AgZWxlbWVudCBpcyBwYXNzZWQgYXMgYSBwYXJhbWV0ZXIuIElmIHRoZSBob29rIHJldHVybnNcbiAgICAgKiAgICAgYSBzdHJpbmcgaXQgaXMgdXNlZCBhcyB0aGUgVVJMIGluc3RlYWQgb2YgdGhlIGBpbWdgIGVsZW1lbnQncyBgc3JjYCBhdHRyaWJ1dGUuXG4gICAgICogYWZ0ZXJMb2FkOiBIb29rIGFmdGVyIFNWRyBpcyBsb2FkZWQuIFRoZSBsb2FkZWQgYHN2Z2AgZWxlbWVudCBhbmQgYHN2Z2Agc3RyaW5nIGFyZSBwYXNzZWQgYXMgYVxuICAgICAqICAgICBwYXJhbWV0ZXJzLiBJZiBjYWNoaW5nIGlzIGFjdGl2ZSB0aGlzIGhvb2sgd2lsbCBvbmx5IGdldCBjYWxsZWQgb25jZSBmb3IgaW5qZWN0ZWQgU1ZHcyB3aXRoIHRoZVxuICAgICAqICAgICBzYW1lIGFic29sdXRlIHBhdGguIENoYW5nZXMgdG8gdGhlIGBzdmdgIGVsZW1lbnQgaW4gdGhpcyBob29rIHdpbGwgYmUgYXBwbGllZCB0byBhbGwgaW5qZWN0ZWQgU1ZHc1xuICAgICAqICAgICB3aXRoIHRoZSBzYW1lIGFic29sdXRlIHBhdGguIEl0J3MgYWxzbyBwb3NzaWJsZSB0byByZXR1cm4gYW4gYHN2Z2Agc3RyaW5nIG9yIGBzdmdgIGVsZW1lbnQgd2hpY2hcbiAgICAgKiAgICAgd2lsbCB0aGVuIGJlIHVzZWQgZm9yIHRoZSBpbmplY3Rpb24uXG4gICAgICogYmVmb3JlSW5qZWN0OiBIb29rIGJlZm9yZSBTVkcgaXMgaW5qZWN0ZWQuIFRoZSBgaW1nYCBhbmQgYHN2Z2AgZWxlbWVudHMgYXJlIHBhc3NlZCBhcyBwYXJhbWV0ZXJzLiBJZlxuICAgICAqICAgICBhbnkgaHRtbCBlbGVtZW50IGlzIHJldHVybmVkIGl0IGdldHMgaW5qZWN0ZWQgaW5zdGVhZCBvZiBhcHBseWluZyB0aGUgZGVmYXVsdCBTVkcgaW5qZWN0aW9uLlxuICAgICAqIGFmdGVySW5qZWN0OiBIb29rIGFmdGVyIFNWRyBpcyBpbmplY3RlZC4gVGhlIGBpbWdgIGFuZCBgc3ZnYCBlbGVtZW50cyBhcmUgcGFzc2VkIGFzIHBhcmFtZXRlcnMuXG4gICAgICogb25BbGxGaW5pc2g6IEhvb2sgYWZ0ZXIgYWxsIGBpbWdgIGVsZW1lbnRzIHBhc3NlZCB0byBhbiBTVkdJbmplY3QoKSBjYWxsIGhhdmUgZWl0aGVyIGJlZW4gaW5qZWN0ZWQgb3JcbiAgICAgKiAgICAgZmFpbGVkIHRvIGluamVjdC5cbiAgICAgKiBvbkZhaWw6IEhvb2sgYWZ0ZXIgaW5qZWN0aW9uIGZhaWxzLiBUaGUgYGltZ2AgZWxlbWVudCBhbmQgYSBgc3RhdHVzYCBzdHJpbmcgYXJlIHBhc3NlZCBhcyBhbiBwYXJhbWV0ZXIuXG4gICAgICogICAgIFRoZSBgc3RhdHVzYCBjYW4gYmUgZWl0aGVyIGAnU1ZHX05PVF9TVVBQT1JURUQnYCAodGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBTVkcpLFxuICAgICAqICAgICBgJ1NWR19JTlZBTElEJ2AgKHRoZSBTVkcgaXMgbm90IGluIGEgdmFsaWQgZm9ybWF0KSBvciBgJ0xPQURfRkFJTEVEJ2AgKGxvYWRpbmcgb2YgdGhlIFNWRyBmYWlsZWQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MSW1hZ2VFbGVtZW50fSBpbWcgLSBhbiBpbWcgZWxlbWVudCBvciBhbiBhcnJheSBvZiBpbWcgZWxlbWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gb3B0aW9uYWwgcGFyYW1ldGVyIHdpdGggW29wdGlvbnNdKCNvcHRpb25zKSBmb3IgdGhpcyBpbmplY3Rpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gU1ZHSW5qZWN0KGltZywgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG1lcmdlT3B0aW9ucyhkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICAgIHZhciBydW4gPSBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIHZhciBhbGxGaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgb25BbGxGaW5pc2ggPSBvcHRpb25zLm9uQWxsRmluaXNoO1xuICAgICAgICAgIGlmIChvbkFsbEZpbmlzaCkge1xuICAgICAgICAgICAgb25BbGxGaW5pc2goKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSAmJiByZXNvbHZlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGltZyAmJiB0eXBlb2YgaW1nW19MRU5HVEhfXSAhPSBfVU5ERUZJTkVEXykge1xuICAgICAgICAgIC8vIGFuIGFycmF5IGxpa2Ugc3RydWN0dXJlIG9mIGltZyBlbGVtZW50c1xuICAgICAgICAgIHZhciBpbmplY3RJbmRleCA9IDA7XG4gICAgICAgICAgdmFyIGluamVjdENvdW50ID0gaW1nW19MRU5HVEhfXTtcblxuICAgICAgICAgIGlmIChpbmplY3RDb3VudCA9PSAwKSB7XG4gICAgICAgICAgICBhbGxGaW5pc2goKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoKytpbmplY3RJbmRleCA9PSBpbmplY3RDb3VudCkge1xuICAgICAgICAgICAgICAgIGFsbEZpbmlzaCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluamVjdENvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgU1ZHSW5qZWN0RWxlbWVudChpbWdbaV0sIG9wdGlvbnMsIGZpbmlzaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG9ubHkgb25lIGltZyBlbGVtZW50XG4gICAgICAgICAgU1ZHSW5qZWN0RWxlbWVudChpbWcsIG9wdGlvbnMsIGFsbEZpbmlzaCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIHJldHVybiBhIFByb21pc2Ugb2JqZWN0IGlmIGdsb2JhbGx5IGF2YWlsYWJsZVxuICAgICAgcmV0dXJuIHR5cGVvZiBQcm9taXNlID09IF9VTkRFRklORURfID8gcnVuKCkgOiBuZXcgUHJvbWlzZShydW4pO1xuICAgIH1cblxuXG4gICAgLy8gSW5qZWN0cyBhIHNpbmdsZSBzdmcgZWxlbWVudC4gT3B0aW9ucyBtdXN0IGJlIGFscmVhZHkgbWVyZ2VkIHdpdGggdGhlIGRlZmF1bHQgb3B0aW9ucy5cbiAgICBmdW5jdGlvbiBTVkdJbmplY3RFbGVtZW50KGltZ0VsZW0sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICBpZiAoaW1nRWxlbSkge1xuICAgICAgICB2YXIgc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUgPSBpbWdFbGVtW19fU1ZHSU5KRUNUXTtcbiAgICAgICAgaWYgKCFzdmdJbmplY3RBdHRyaWJ1dGVWYWx1ZSkge1xuICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZ0VsZW0pO1xuXG4gICAgICAgICAgaWYgKCFJU19TVkdfU1VQUE9SVEVEKSB7XG4gICAgICAgICAgICBzdmdOb3RTdXBwb3J0ZWQoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBJbnZva2UgYmVmb3JlTG9hZCBob29rIGlmIHNldC4gSWYgdGhlIGJlZm9yZUxvYWQgcmV0dXJucyBhIHZhbHVlIHVzZSBpdCBhcyB0aGUgc3JjIGZvciB0aGUgbG9hZFxuICAgICAgICAgIC8vIFVSTCBwYXRoLiBFbHNlIHVzZSB0aGUgaW1nRWxlbSdzIHNyYyBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgICAgICAgdmFyIGJlZm9yZUxvYWQgPSBvcHRpb25zLmJlZm9yZUxvYWQ7XG4gICAgICAgICAgdmFyIHNyYyA9IChiZWZvcmVMb2FkICYmIGJlZm9yZUxvYWQoaW1nRWxlbSkpIHx8IGltZ0VsZW1bX0dFVF9BVFRSSUJVVEVfXSgnc3JjJyk7XG5cbiAgICAgICAgICBpZiAoIXNyYykge1xuICAgICAgICAgICAgLy8gSWYgbm8gaW1hZ2Ugc3JjIGF0dHJpYnV0ZSBpcyBzZXQgZG8gbm8gaW5qZWN0aW9uLiBUaGlzIGNhbiBvbmx5IGJlIHJlYWNoZWQgYnkgdXNpbmcgamF2YXNjcmlwdFxuICAgICAgICAgICAgLy8gYmVjYXVzZSBpZiBubyBzcmMgYXR0cmlidXRlIGlzIHNldCB0aGUgb25sb2FkIGFuZCBvbmVycm9yIGV2ZW50cyBkbyBub3QgZ2V0IGNhbGxlZFxuICAgICAgICAgICAgaWYgKHNyYyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgbG9hZEZhaWwoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHNldCBhcnJheSBzbyBsYXRlciBjYWxscyBjYW4gcmVnaXN0ZXIgY2FsbGJhY2tzXG4gICAgICAgICAgdmFyIG9uRmluaXNoQ2FsbGJhY2tzID0gW107XG4gICAgICAgICAgaW1nRWxlbVtfX1NWR0lOSkVDVF0gPSBvbkZpbmlzaENhbGxiYWNrcztcblxuICAgICAgICAgIHZhciBvbkZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIG9uRmluaXNoQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24ob25GaW5pc2hDYWxsYmFjaykge1xuICAgICAgICAgICAgICBvbkZpbmlzaENhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdmFyIGFic1VybCA9IGdldEFic29sdXRlVXJsKHNyYyk7XG4gICAgICAgICAgdmFyIHVzZUNhY2hlT3B0aW9uID0gb3B0aW9ucy51c2VDYWNoZTtcbiAgICAgICAgICB2YXIgbWFrZUlkc1VuaXF1ZU9wdGlvbiA9IG9wdGlvbnMubWFrZUlkc1VuaXF1ZTtcbiAgICAgICAgICBcbiAgICAgICAgICB2YXIgc2V0U3ZnTG9hZENhY2hlVmFsdWUgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgIGlmICh1c2VDYWNoZU9wdGlvbikge1xuICAgICAgICAgICAgICBzdmdMb2FkQ2FjaGVbYWJzVXJsXS5mb3JFYWNoKGZ1bmN0aW9uKHN2Z0xvYWQpIHtcbiAgICAgICAgICAgICAgICBzdmdMb2FkKHZhbCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBzdmdMb2FkQ2FjaGVbYWJzVXJsXSA9IHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKHVzZUNhY2hlT3B0aW9uKSB7XG4gICAgICAgICAgICB2YXIgc3ZnTG9hZCA9IHN2Z0xvYWRDYWNoZVthYnNVcmxdO1xuXG4gICAgICAgICAgICB2YXIgaGFuZGxlTG9hZFZhbHVlID0gZnVuY3Rpb24obG9hZFZhbHVlKSB7XG4gICAgICAgICAgICAgIGlmIChsb2FkVmFsdWUgPT09IExPQURfRkFJTCkge1xuICAgICAgICAgICAgICAgIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvYWRWYWx1ZSA9PT0gU1ZHX0lOVkFMSUQpIHtcbiAgICAgICAgICAgICAgICBzdmdJbnZhbGlkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBoYXNVbmlxdWVJZHMgPSBsb2FkVmFsdWVbMF07XG4gICAgICAgICAgICAgICAgdmFyIHN2Z1N0cmluZyA9IGxvYWRWYWx1ZVsxXTtcbiAgICAgICAgICAgICAgICB2YXIgdW5pcXVlSWRzU3ZnU3RyaW5nID0gbG9hZFZhbHVlWzJdO1xuICAgICAgICAgICAgICAgIHZhciBzdmdFbGVtO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1ha2VJZHNVbmlxdWVPcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChoYXNVbmlxdWVJZHMgPT09IE5VTEwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSURzIGZvciB0aGUgU1ZHIHN0cmluZyBoYXZlIG5vdCBiZWVuIG1hZGUgdW5pcXVlIGJlZm9yZS4gVGhpcyBtYXkgaGFwcGVuIGlmIHByZXZpb3VzXG4gICAgICAgICAgICAgICAgICAgIC8vIGluamVjdGlvbiBvZiBhIGNhY2hlZCBTVkcgaGF2ZSBiZWVuIHJ1biB3aXRoIHRoZSBvcHRpb24gbWFrZWRJZHNVbmlxdWUgc2V0IHRvIGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIHN2Z0VsZW0gPSBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyaW5nLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGhhc1VuaXF1ZUlkcyA9IG1ha2VJZHNVbmlxdWUoc3ZnRWxlbSwgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxvYWRWYWx1ZVswXSA9IGhhc1VuaXF1ZUlkcztcbiAgICAgICAgICAgICAgICAgICAgbG9hZFZhbHVlWzJdID0gaGFzVW5pcXVlSWRzICYmIHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzVW5pcXVlSWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1ha2UgSURzIHVuaXF1ZSBmb3IgYWxyZWFkeSBjYWNoZWQgU1ZHcyB3aXRoIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgICAgICAgICBzdmdTdHJpbmcgPSBtYWtlSWRzVW5pcXVlQ2FjaGVkKHVuaXF1ZUlkc1N2Z1N0cmluZyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3ZnRWxlbSA9IHN2Z0VsZW0gfHwgYnVpbGRTdmdFbGVtZW50KHN2Z1N0cmluZywgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgaW5qZWN0KGltZ0VsZW0sIHN2Z0VsZW0sIGFic1VybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb25GaW5pc2goKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3ZnTG9hZCAhPSBfVU5ERUZJTkVEXykge1xuICAgICAgICAgICAgICAvLyBWYWx1ZSBmb3IgdXJsIGV4aXN0cyBpbiBjYWNoZVxuICAgICAgICAgICAgICBpZiAoc3ZnTG9hZC5pc0NhbGxiYWNrUXVldWUpIHtcbiAgICAgICAgICAgICAgICAvLyBTYW1lIHVybCBoYXMgYmVlbiBjYWNoZWQsIGJ1dCB2YWx1ZSBoYXMgbm90IGJlZW4gbG9hZGVkIHlldCwgc28gYWRkIHRvIGNhbGxiYWNrc1xuICAgICAgICAgICAgICAgIHN2Z0xvYWQucHVzaChoYW5kbGVMb2FkVmFsdWUpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGhhbmRsZUxvYWRWYWx1ZShzdmdMb2FkKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgc3ZnTG9hZCA9IFtdO1xuICAgICAgICAgICAgICAvLyBzZXQgcHJvcGVydHkgaXNDYWxsYmFja1F1ZXVlIHRvIEFycmF5IHRvIGRpZmZlcmVudGlhdGUgZnJvbSBhcnJheSB3aXRoIGNhY2hlZCBsb2FkZWQgdmFsdWVzXG4gICAgICAgICAgICAgIHN2Z0xvYWQuaXNDYWxsYmFja1F1ZXVlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0gPSBzdmdMb2FkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIExvYWQgdGhlIFNWRyBiZWNhdXNlIGl0IGlzIG5vdCBjYWNoZWQgb3IgY2FjaGluZyBpcyBkaXNhYmxlZFxuICAgICAgICAgIGxvYWRTdmcoYWJzVXJsLCBmdW5jdGlvbihzdmdYbWwsIHN2Z1N0cmluZykge1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBYTUwgZnJvbSB0aGUgWEhSIHJlcXVlc3QgaWYgaXQgaXMgYW4gaW5zdGFuY2Ugb2YgRG9jdW1lbnQuIE90aGVyd2lzZVxuICAgICAgICAgICAgLy8gKGZvciBleGFtcGxlIG9mIElFOSksIGNyZWF0ZSB0aGUgc3ZnIGRvY3VtZW50IGZyb20gdGhlIHN2ZyBzdHJpbmcuXG4gICAgICAgICAgICB2YXIgc3ZnRWxlbSA9IHN2Z1htbCBpbnN0YW5jZW9mIERvY3VtZW50ID8gc3ZnWG1sLmRvY3VtZW50RWxlbWVudCA6IGJ1aWxkU3ZnRWxlbWVudChzdmdTdHJpbmcsIHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgYWZ0ZXJMb2FkID0gb3B0aW9ucy5hZnRlckxvYWQ7XG4gICAgICAgICAgICBpZiAoYWZ0ZXJMb2FkKSB7XG4gICAgICAgICAgICAgIC8vIEludm9rZSBhZnRlckxvYWQgaG9vayB3aGljaCBtYXkgbW9kaWZ5IHRoZSBTVkcgZWxlbWVudC4gQWZ0ZXIgbG9hZCBtYXkgYWxzbyByZXR1cm4gYSBuZXdcbiAgICAgICAgICAgICAgLy8gc3ZnIGVsZW1lbnQgb3Igc3ZnIHN0cmluZ1xuICAgICAgICAgICAgICB2YXIgc3ZnRWxlbU9yU3ZnU3RyaW5nID0gYWZ0ZXJMb2FkKHN2Z0VsZW0sIHN2Z1N0cmluZykgfHwgc3ZnRWxlbTtcbiAgICAgICAgICAgICAgaWYgKHN2Z0VsZW1PclN2Z1N0cmluZykge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBzdmdFbGVtIGFuZCBzdmdTdHJpbmcgYmVjYXVzZSBvZiBtb2RpZmljYXRpb25zIHRvIHRoZSBTVkcgZWxlbWVudCBvciBTVkcgc3RyaW5nIGluXG4gICAgICAgICAgICAgICAgLy8gdGhlIGFmdGVyTG9hZCBob29rLCBzbyB0aGUgbW9kaWZpZWQgU1ZHIGlzIGFsc28gdXNlZCBmb3IgYWxsIGxhdGVyIGNhY2hlZCBpbmplY3Rpb25zXG4gICAgICAgICAgICAgICAgdmFyIGlzU3RyaW5nID0gdHlwZW9mIHN2Z0VsZW1PclN2Z1N0cmluZyA9PSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICBzdmdTdHJpbmcgPSBpc1N0cmluZyA/IHN2Z0VsZW1PclN2Z1N0cmluZyA6IHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtKTtcbiAgICAgICAgICAgICAgICBzdmdFbGVtID0gaXNTdHJpbmcgPyBidWlsZFN2Z0VsZW1lbnQoc3ZnRWxlbU9yU3ZnU3RyaW5nLCB0cnVlKSA6IHN2Z0VsZW1PclN2Z1N0cmluZztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3ZnRWxlbSBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHtcbiAgICAgICAgICAgICAgdmFyIGhhc1VuaXF1ZUlkcyA9IE5VTEw7XG4gICAgICAgICAgICAgIGlmIChtYWtlSWRzVW5pcXVlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgaGFzVW5pcXVlSWRzID0gbWFrZUlkc1VuaXF1ZShzdmdFbGVtLCBmYWxzZSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAodXNlQ2FjaGVPcHRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgdW5pcXVlSWRzU3ZnU3RyaW5nID0gaGFzVW5pcXVlSWRzICYmIHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtKTtcbiAgICAgICAgICAgICAgICAvLyBzZXQgYW4gYXJyYXkgd2l0aCB0aHJlZSBlbnRyaWVzIHRvIHRoZSBsb2FkIGNhY2hlXG4gICAgICAgICAgICAgICAgc2V0U3ZnTG9hZENhY2hlVmFsdWUoW2hhc1VuaXF1ZUlkcywgc3ZnU3RyaW5nLCB1bmlxdWVJZHNTdmdTdHJpbmddKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGluamVjdChpbWdFbGVtLCBzdmdFbGVtLCBhYnNVcmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgc2V0U3ZnTG9hZENhY2hlVmFsdWUoU1ZHX0lOVkFMSUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb25GaW5pc2goKTtcbiAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgc2V0U3ZnTG9hZENhY2hlVmFsdWUoTE9BRF9GQUlMKTtcbiAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUpKSB7XG4gICAgICAgICAgICAvLyBzdmdJbmplY3RBdHRyaWJ1dGVWYWx1ZSBpcyBhbiBhcnJheS4gSW5qZWN0aW9uIGlzIG5vdCBjb21wbGV0ZSBzbyByZWdpc3RlciBjYWxsYmFja1xuICAgICAgICAgICAgc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbWdOb3RTZXQoKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGRlZmF1bHQgW29wdGlvbnNdKCNvcHRpb25zKSBmb3IgU1ZHSW5qZWN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIGRlZmF1bHQgW29wdGlvbnNdKCNvcHRpb25zKSBmb3IgYW4gaW5qZWN0aW9uLlxuICAgICAqL1xuICAgIFNWR0luamVjdC5zZXRPcHRpb25zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgZGVmYXVsdE9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuICAgIH07XG5cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBTVkdJbmplY3RcbiAgICBTVkdJbmplY3QuY3JlYXRlID0gY3JlYXRlU1ZHSW5qZWN0O1xuXG5cbiAgICAvKipcbiAgICAgKiBVc2VkIGluIG9uZXJyb3IgRXZlbnQgb2YgYW4gYDxpbWc+YCBlbGVtZW50IHRvIGhhbmRsZSBjYXNlcyB3aGVuIHRoZSBsb2FkaW5nIHRoZSBvcmlnaW5hbCBzcmMgZmFpbHNcbiAgICAgKiAoZm9yIGV4YW1wbGUgaWYgZmlsZSBpcyBub3QgZm91bmQgb3IgaWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBTVkcpLiBUaGlzIHRyaWdnZXJzIGEgY2FsbCB0byB0aGVcbiAgICAgKiBvcHRpb25zIG9uRmFpbCBob29rIGlmIGF2YWlsYWJsZS4gVGhlIG9wdGlvbmFsIHNlY29uZCBwYXJhbWV0ZXIgd2lsbCBiZSBzZXQgYXMgdGhlIG5ldyBzcmMgYXR0cmlidXRlXG4gICAgICogZm9yIHRoZSBpbWcgZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEltYWdlRWxlbWVudH0gaW1nIC0gYW4gaW1nIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2ZhbGxiYWNrU3JjXSAtIG9wdGlvbmFsIHBhcmFtZXRlciBmYWxsYmFjayBzcmNcbiAgICAgKi9cbiAgICBTVkdJbmplY3QuZXJyID0gZnVuY3Rpb24oaW1nLCBmYWxsYmFja1NyYykge1xuICAgICAgaWYgKGltZykge1xuICAgICAgICBpZiAoaW1nW19fU1ZHSU5KRUNUXSAhPSBGQUlMKSB7XG4gICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoaW1nKTtcblxuICAgICAgICAgIGlmICghSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgICAgICAgc3ZnTm90U3VwcG9ydGVkKGltZywgZGVmYXVsdE9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nKTtcbiAgICAgICAgICAgIGxvYWRGYWlsKGltZywgZGVmYXVsdE9wdGlvbnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmFsbGJhY2tTcmMpIHtcbiAgICAgICAgICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWcpO1xuICAgICAgICAgICAgaW1nLnNyYyA9IGZhbGxiYWNrU3JjO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW1nTm90U2V0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvd1tnbG9iYWxOYW1lXSA9IFNWR0luamVjdDtcblxuICAgIHJldHVybiBTVkdJbmplY3Q7XG4gIH1cblxuICB2YXIgU1ZHSW5qZWN0SW5zdGFuY2UgPSBjcmVhdGVTVkdJbmplY3QoJ1NWR0luamVjdCcpO1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU1ZHSW5qZWN0SW5zdGFuY2U7XG4gIH1cbn0pKHdpbmRvdywgZG9jdW1lbnQpOyIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyA9IG5ldyBVUkwoXCIuL2Fzc2V0cy9mb250cy9Sb2JvdG9fQ29uZGVuc2VkL3N0YXRpYy9Sb2JvdG9Db25kZW5zZWQtTWVkaXVtLnR0ZlwiLCBpbXBvcnQubWV0YS51cmwpO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX18gPSBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8wX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgQGZvbnQtZmFjZSB7XG4gIC8qIGh0dHBzOi8vZm9udHMuZ29vZ2xlLmNvbS9zcGVjaW1lbi9Sb2JvdG8rQ29uZGVuc2VkICovXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XG4gIHNyYzogdXJsKCR7X19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fX30pO1xuICBmb250LXdlaWdodDogNjAwO1xuICBmb250LXN0eWxlOiBub3JtYWw7XG59XG5cbiosXG4qOjpiZWZvcmUsXG4qOjphZnRlciB7XG4gIHBhZGRpbmc6IDA7XG4gIG1hcmdpbjogMDtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbn1cblxuYm9keSB7XG4gIG1pbi1oZWlnaHQ6IDEwMHN2aDtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE0OSwgMTE2LCA1OSk7XG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCcsIEFyaWFsO1xuICBmb250LWZhbWlseTogJ1JvYm90byBDb25kZW5zZWQnO1xuICBmb250LWZhbWlseTogQXJpYWw7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9hcHAuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsdURBQXVEO0VBQ3ZELCtCQUErQjtFQUMvQiw0Q0FBMkU7RUFDM0UsZ0JBQWdCO0VBQ2hCLGtCQUFrQjtBQUNwQjs7QUFFQTs7O0VBR0UsVUFBVTtFQUNWLFNBQVM7RUFDVCxzQkFBc0I7QUFDeEI7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsbUNBQW1DO0VBQ25DLHNDQUFzQztFQUN0QywrQkFBK0I7RUFDL0Isa0JBQWtCO0FBQ3BCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIkBmb250LWZhY2Uge1xcbiAgLyogaHR0cHM6Ly9mb250cy5nb29nbGUuY29tL3NwZWNpbWVuL1JvYm90bytDb25kZW5zZWQgKi9cXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XFxuICBzcmM6IHVybCguL2Fzc2V0cy9mb250cy9Sb2JvdG9fQ29uZGVuc2VkL3N0YXRpYy9Sb2JvdG9Db25kZW5zZWQtTWVkaXVtLnR0Zik7XFxuICBmb250LXdlaWdodDogNjAwO1xcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xcbn1cXG5cXG4qLFxcbio6OmJlZm9yZSxcXG4qOjphZnRlciB7XFxuICBwYWRkaW5nOiAwO1xcbiAgbWFyZ2luOiAwO1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG59XFxuXFxuYm9keSB7XFxuICBtaW4taGVpZ2h0OiAxMDBzdmg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMTQ5LCAxMTYsIDU5KTtcXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCcsIEFyaWFsO1xcbiAgZm9udC1mYW1pbHk6ICdSb2JvdG8gQ29uZGVuc2VkJztcXG4gIGZvbnQtZmFtaWx5OiBBcmlhbDtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjbmF2YmFyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xufVxuXG4jbmF2YmFyID4gKiB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGxpc3Qtc3R5bGU6IG5vbmU7XG59XG5cbi5uYXZfcmlnaHQge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG59XG5cbi5uYXZfcmlnaHQgPiA6bGFzdC1jaGlsZCB7XG4gIC8qIEV4cGVyaW1lbnRpbmcgKi9cbiAgcG9zaXRpb246IGFic29sdXRlO1xuICByaWdodDogMDtcbiAgdG9wOiAxZW07XG4gIHBhZGRpbmc6IDFyZW07XG59XG5cbi5uYXZfaXRlbS5uYXZfbG9nbyB7XG4gIGRpc3BsYXk6IGZsZXg7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9zdHlsZXMvbmF2YmFyLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGFBQWE7RUFDYiw4QkFBOEI7QUFDaEM7O0FBRUE7RUFDRSxhQUFhO0VBQ2IsZ0JBQWdCO0FBQ2xCOztBQUVBO0VBQ0Usa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLGtCQUFrQjtFQUNsQixRQUFRO0VBQ1IsUUFBUTtFQUNSLGFBQWE7QUFDZjs7QUFFQTtFQUNFLGFBQWE7QUFDZlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjbmF2YmFyIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XFxufVxcblxcbiNuYXZiYXIgPiAqIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbn1cXG5cXG4ubmF2X3JpZ2h0IHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG59XFxuXFxuLm5hdl9yaWdodCA+IDpsYXN0LWNoaWxkIHtcXG4gIC8qIEV4cGVyaW1lbnRpbmcgKi9cXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHJpZ2h0OiAwO1xcbiAgdG9wOiAxZW07XFxuICBwYWRkaW5nOiAxcmVtO1xcbn1cXG5cXG4ubmF2X2l0ZW0ubmF2X2xvZ28ge1xcbiAgZGlzcGxheTogZmxleDtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIGAjYm9hcmRfY29udGFpbmVyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIGdhcDogNHJlbTtcbn1cblxuLnBsYXllcl90d28ud2FpdCA+IC5nYW1lX3N0YXJ0IHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAyMCU7XG59XG5cbi5wbGF5ZXJfb25lLndhaXQgPiAuYm9hcmQsXG4ucGxheWVyX29uZS53YWl0ID4gaDQsXG4ucGxheWVyX3R3by53YWl0ID4gLmJvYXJkLFxuLnBsYXllcl90d28ud2FpdCA+IGg0IHtcbiAgb3BhY2l0eTogMC40O1xufVxuXG4ucGxheWVyX29uZSxcbi5wbGF5ZXJfdHdvIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBmb250LXNpemU6IDJyZW07XG59XG5cbiNib2FyZF9jb250YWluZXIgPiAqID4gLmJvYXJkIHtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMTAsIDJlbSk7XG4gIGdyaWQtYXV0by1yb3dzOiAyZW07XG59XG5cbiNib2FyZF9jb250YWluZXIgPiAqOm5vdCgud2FpdCkgPiAuYm9hcmQgPiAuY2VsbCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xufVxuXG4ucGxheWVyX3R3byA+IC5nYW1lX3N0YXJ0IHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLmdhbWVfc3RhcnQgPiBidXR0b24ge1xuICB3aWR0aDogMTUwcHg7XG4gIGhlaWdodDogMTUwcHg7XG4gIGZvbnQtc2l6ZTogNHJlbTtcbn1cblxuLmNlbGwge1xuICAvKiB3aWR0aDogMTZweDtcbiAgaGVpZ2h0OiAxNnB4OyAqL1xuICBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTtcbiAgYm9yZGVyOiAwLjVweCBzb2xpZCBibGFjaztcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBjdXJzb3I6IHBvaW50ZXI7XG59XG5cbi5jZWxsID4gKiB7XG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xufVxuXG4uY2VsbCA+IC5jZWxsX2NvbnRlbnQge1xuICBoZWlnaHQ6IDEwMCU7XG59XG5cbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcbiAgLypcbiAgU2hvdyBzaGlwIGR1cmluZyBwbGFjaW5nIHNoaXBzIHBoYXNlXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxuICAqL1xuICBoZWlnaHQ6IGluaGVyaXQ7XG4gIGJhY2tncm91bmQtY29sb3I6IGNvcm5mbG93ZXJibHVlO1xufVxuXG4jYm9hcmRfY29udGFpbmVyID4gKiAuYm9hcmQgPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XG59XG5cbiNib2FyZF9jb250YWluZXIgPiAqID4gLmJvYXJkID4gLmNlbGwubWlzcyB7XG4gIGJhY2tncm91bmQtY29sb3I6IGdyZXk7XG59XG5cbi5jZWxsID4gLnJvd19tYXJrZXIge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAgbGVmdDogLTJlbTtcbiAgdG9wOiAwO1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xufVxuXG4uY2VsbCA+IC5jb2xfbWFya2VyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IC0yZW07XG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgd2lkdGg6IDEwMCU7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9zdHlsZXMvc2NyZWVuQ29udHJvbGxlci5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxhQUFhO0VBQ2IsdUJBQXVCO0VBQ3ZCLFNBQVM7QUFDWDs7QUFFQTtFQUNFLGNBQWM7RUFDZCxrQkFBa0I7RUFDbEIsUUFBUTtBQUNWOztBQUVBOzs7O0VBSUUsWUFBWTtBQUNkOztBQUVBOztFQUVFLGtCQUFrQjtFQUNsQixlQUFlO0FBQ2pCOztBQUVBO0VBQ0UsYUFBYTtFQUNiLHNDQUFzQztFQUN0QyxtQkFBbUI7QUFDckI7O0FBRUE7RUFDRSw2QkFBNkI7QUFDL0I7O0FBRUE7RUFDRSxhQUFhO0FBQ2Y7O0FBRUE7RUFDRSxZQUFZO0VBQ1osYUFBYTtFQUNiLGVBQWU7QUFDakI7O0FBRUE7RUFDRTtpQkFDZTtFQUNmLHVCQUF1QjtFQUN2Qix5QkFBeUI7RUFDekIsa0JBQWtCO0VBQ2xCLGVBQWU7QUFDakI7O0FBRUE7RUFDRSxvQkFBb0I7QUFDdEI7O0FBRUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRTs7O0dBR0M7RUFDRCxlQUFlO0VBQ2YsZ0NBQWdDO0FBQ2xDOztBQUVBO0VBQ0UscUJBQXFCO0FBQ3ZCOztBQUVBO0VBQ0Usc0JBQXNCO0FBQ3hCOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLFlBQVk7RUFDWixhQUFhO0VBQ2IsVUFBVTtFQUNWLE1BQU07RUFDTixtQkFBbUI7QUFDckI7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsU0FBUztFQUNULGtCQUFrQjtFQUNsQixXQUFXO0FBQ2JcIixcInNvdXJjZXNDb250ZW50XCI6W1wiI2JvYXJkX2NvbnRhaW5lciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XFxuICBnYXA6IDRyZW07XFxufVxcblxcbi5wbGF5ZXJfdHdvLndhaXQgPiAuZ2FtZV9zdGFydCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMjAlO1xcbn1cXG5cXG4ucGxheWVyX29uZS53YWl0ID4gLmJvYXJkLFxcbi5wbGF5ZXJfb25lLndhaXQgPiBoNCxcXG4ucGxheWVyX3R3by53YWl0ID4gLmJvYXJkLFxcbi5wbGF5ZXJfdHdvLndhaXQgPiBoNCB7XFxuICBvcGFjaXR5OiAwLjQ7XFxufVxcblxcbi5wbGF5ZXJfb25lLFxcbi5wbGF5ZXJfdHdvIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGZvbnQtc2l6ZTogMnJlbTtcXG59XFxuXFxuI2JvYXJkX2NvbnRhaW5lciA+ICogPiAuYm9hcmQge1xcbiAgZGlzcGxheTogZ3JpZDtcXG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDEwLCAyZW0pO1xcbiAgZ3JpZC1hdXRvLXJvd3M6IDJlbTtcXG59XFxuXFxuI2JvYXJkX2NvbnRhaW5lciA+ICo6bm90KC53YWl0KSA+IC5ib2FyZCA+IC5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG5cXG4ucGxheWVyX3R3byA+IC5nYW1lX3N0YXJ0IHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcblxcbi5nYW1lX3N0YXJ0ID4gYnV0dG9uIHtcXG4gIHdpZHRoOiAxNTBweDtcXG4gIGhlaWdodDogMTUwcHg7XFxuICBmb250LXNpemU6IDRyZW07XFxufVxcblxcbi5jZWxsIHtcXG4gIC8qIHdpZHRoOiAxNnB4O1xcbiAgaGVpZ2h0OiAxNnB4OyAqL1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxuICBib3JkZXI6IDAuNXB4IHNvbGlkIGJsYWNrO1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG5cXG4uY2VsbCA+ICoge1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxufVxcblxcbi5jZWxsID4gLmNlbGxfY29udGVudCB7XFxuICBoZWlnaHQ6IDEwMCU7XFxufVxcblxcbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcXG4gIC8qXFxuICBTaG93IHNoaXAgZHVyaW5nIHBsYWNpbmcgc2hpcHMgcGhhc2VcXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxcbiAgKi9cXG4gIGhlaWdodDogaW5oZXJpdDtcXG4gIGJhY2tncm91bmQtY29sb3I6IGNvcm5mbG93ZXJibHVlO1xcbn1cXG5cXG4jYm9hcmRfY29udGFpbmVyID4gKiAuYm9hcmQgPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogcmVkO1xcbn1cXG5cXG4jYm9hcmRfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+IC5jZWxsLm1pc3Mge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogZ3JleTtcXG59XFxuXFxuLmNlbGwgPiAucm93X21hcmtlciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBoZWlnaHQ6IDEwMCU7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgbGVmdDogLTJlbTtcXG4gIHRvcDogMDtcXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxufVxcblxcbi5jZWxsID4gLmNvbF9tYXJrZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAtMmVtO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgd2lkdGg6IDEwMCU7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAgTUlUIExpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAgQXV0aG9yIFRvYmlhcyBLb3BwZXJzIEBzb2tyYVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcpIHtcbiAgdmFyIGxpc3QgPSBbXTtcblxuICAvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG4gIGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHZhciBjb250ZW50ID0gXCJcIjtcbiAgICAgIHZhciBuZWVkTGF5ZXIgPSB0eXBlb2YgaXRlbVs1XSAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICAgIGlmIChpdGVtWzRdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbWVkaWEgXCIuY29uY2F0KGl0ZW1bMl0sIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbGF5ZXJcIi5jb25jYXQoaXRlbVs1XS5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KGl0ZW1bNV0pIDogXCJcIiwgXCIge1wiKTtcbiAgICAgIH1cbiAgICAgIGNvbnRlbnQgKz0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtKTtcbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSkuam9pbihcIlwiKTtcbiAgfTtcblxuICAvLyBpbXBvcnQgYSBsaXN0IG9mIG1vZHVsZXMgaW50byB0aGUgbGlzdFxuICBsaXN0LmkgPSBmdW5jdGlvbiBpKG1vZHVsZXMsIG1lZGlhLCBkZWR1cGUsIHN1cHBvcnRzLCBsYXllcikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbW9kdWxlcyA9IFtbbnVsbCwgbW9kdWxlcywgdW5kZWZpbmVkXV07XG4gICAgfVxuICAgIHZhciBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzID0ge307XG4gICAgaWYgKGRlZHVwZSkge1xuICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXNba11bMF07XG4gICAgICAgIGlmIChpZCAhPSBudWxsKSB7XG4gICAgICAgICAgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpZF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIF9rID0gMDsgX2sgPCBtb2R1bGVzLmxlbmd0aDsgX2srKykge1xuICAgICAgdmFyIGl0ZW0gPSBbXS5jb25jYXQobW9kdWxlc1tfa10pO1xuICAgICAgaWYgKGRlZHVwZSAmJiBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBsYXllciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBpZiAodHlwZW9mIGl0ZW1bNV0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChtZWRpYSkge1xuICAgICAgICBpZiAoIWl0ZW1bMl0pIHtcbiAgICAgICAgICBpdGVtWzJdID0gbWVkaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3VwcG9ydHMpIHtcbiAgICAgICAgaWYgKCFpdGVtWzRdKSB7XG4gICAgICAgICAgaXRlbVs0XSA9IFwiXCIuY29uY2F0KHN1cHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNF0gPSBzdXBwb3J0cztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGlzdC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGxpc3Q7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIGlmICghdXJsKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICB1cmwgPSBTdHJpbmcodXJsLl9fZXNNb2R1bGUgPyB1cmwuZGVmYXVsdCA6IHVybCk7XG5cbiAgLy8gSWYgdXJsIGlzIGFscmVhZHkgd3JhcHBlZCBpbiBxdW90ZXMsIHJlbW92ZSB0aGVtXG4gIGlmICgvXlsnXCJdLipbJ1wiXSQvLnRlc3QodXJsKSkge1xuICAgIHVybCA9IHVybC5zbGljZSgxLCAtMSk7XG4gIH1cbiAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgIHVybCArPSBvcHRpb25zLmhhc2g7XG4gIH1cblxuICAvLyBTaG91bGQgdXJsIGJlIHdyYXBwZWQ/XG4gIC8vIFNlZSBodHRwczovL2RyYWZ0cy5jc3N3Zy5vcmcvY3NzLXZhbHVlcy0zLyN1cmxzXG4gIGlmICgvW1wiJygpIFxcdFxcbl18KCUyMCkvLnRlc3QodXJsKSB8fCBvcHRpb25zLm5lZWRRdW90ZXMpIHtcbiAgICByZXR1cm4gXCJcXFwiXCIuY29uY2F0KHVybC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIiksIFwiXFxcIlwiKTtcbiAgfVxuICByZXR1cm4gdXJsO1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXRlbSkge1xuICB2YXIgY29udGVudCA9IGl0ZW1bMV07XG4gIHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcbiAgaWYgKCFjc3NNYXBwaW5nKSB7XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH1cbiAgaWYgKHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoY3NzTWFwcGluZykpKSk7XG4gICAgdmFyIGRhdGEgPSBcInNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LFwiLmNvbmNhdChiYXNlNjQpO1xuICAgIHZhciBzb3VyY2VNYXBwaW5nID0gXCIvKiMgXCIuY29uY2F0KGRhdGEsIFwiICovXCIpO1xuICAgIHJldHVybiBbY29udGVudF0uY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbihcIlxcblwiKTtcbiAgfVxuICByZXR1cm4gW2NvbnRlbnRdLmpvaW4oXCJcXG5cIik7XG59OyIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9hcHAuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9hcHAuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25hdmJhci5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25hdmJhci5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vc2NyZWVuQ29udHJvbGxlci5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3NjcmVlbkNvbnRyb2xsZXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzdHlsZXNJbkRPTSA9IFtdO1xuZnVuY3Rpb24gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICB2YXIgcmVzdWx0ID0gLTE7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3R5bGVzSW5ET00ubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3R5bGVzSW5ET01baV0uaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcikge1xuICAgICAgcmVzdWx0ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGlkQ291bnRNYXAgPSB7fTtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICB2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcbiAgICB2YXIgY291bnQgPSBpZENvdW50TWFwW2lkXSB8fCAwO1xuICAgIHZhciBpZGVudGlmaWVyID0gXCJcIi5jb25jYXQoaWQsIFwiIFwiKS5jb25jYXQoY291bnQpO1xuICAgIGlkQ291bnRNYXBbaWRdID0gY291bnQgKyAxO1xuICAgIHZhciBpbmRleEJ5SWRlbnRpZmllciA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgIHZhciBvYmogPSB7XG4gICAgICBjc3M6IGl0ZW1bMV0sXG4gICAgICBtZWRpYTogaXRlbVsyXSxcbiAgICAgIHNvdXJjZU1hcDogaXRlbVszXSxcbiAgICAgIHN1cHBvcnRzOiBpdGVtWzRdLFxuICAgICAgbGF5ZXI6IGl0ZW1bNV1cbiAgICB9O1xuICAgIGlmIChpbmRleEJ5SWRlbnRpZmllciAhPT0gLTEpIHtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS5yZWZlcmVuY2VzKys7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0udXBkYXRlcihvYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdXBkYXRlciA9IGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5ieUluZGV4ID0gaTtcbiAgICAgIHN0eWxlc0luRE9NLnNwbGljZShpLCAwLCB7XG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHVwZGF0ZXI6IHVwZGF0ZXIsXG4gICAgICAgIHJlZmVyZW5jZXM6IDFcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG4gIHJldHVybiBpZGVudGlmaWVycztcbn1cbmZ1bmN0aW9uIGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpIHtcbiAgdmFyIGFwaSA9IG9wdGlvbnMuZG9tQVBJKG9wdGlvbnMpO1xuICBhcGkudXBkYXRlKG9iaik7XG4gIHZhciB1cGRhdGVyID0gZnVuY3Rpb24gdXBkYXRlcihuZXdPYmopIHtcbiAgICBpZiAobmV3T2JqKSB7XG4gICAgICBpZiAobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwICYmIG5ld09iai5zdXBwb3J0cyA9PT0gb2JqLnN1cHBvcnRzICYmIG5ld09iai5sYXllciA9PT0gb2JqLmxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFwaS51cGRhdGUob2JqID0gbmV3T2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBpLnJlbW92ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHVwZGF0ZXI7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgdmFyIGxhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG4gICAgbmV3TGlzdCA9IG5ld0xpc3QgfHwgW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpZGVudGlmaWVyID0gbGFzdElkZW50aWZpZXJzW2ldO1xuICAgICAgdmFyIGluZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleF0ucmVmZXJlbmNlcy0tO1xuICAgIH1cbiAgICB2YXIgbmV3TGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKG5ld0xpc3QsIG9wdGlvbnMpO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuICAgICAgdmFyIF9pbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKF9pZGVudGlmaWVyKTtcbiAgICAgIGlmIChzdHlsZXNJbkRPTVtfaW5kZXhdLnJlZmVyZW5jZXMgPT09IDApIHtcbiAgICAgICAgc3R5bGVzSW5ET01bX2luZGV4XS51cGRhdGVyKCk7XG4gICAgICAgIHN0eWxlc0luRE9NLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBsYXN0SWRlbnRpZmllcnMgPSBuZXdMYXN0SWRlbnRpZmllcnM7XG4gIH07XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbWVtbyA9IHt9O1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGdldFRhcmdldCh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiBtZW1vW3RhcmdldF0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgc3R5bGVUYXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCk7XG5cbiAgICAvLyBTcGVjaWFsIGNhc2UgdG8gcmV0dXJuIGhlYWQgb2YgaWZyYW1lIGluc3RlYWQgb2YgaWZyYW1lIGl0c2VsZlxuICAgIGlmICh3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQgJiYgc3R5bGVUYXJnZXQgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgIC8vIGR1ZSB0byBjcm9zcy1vcmlnaW4gcmVzdHJpY3Rpb25zXG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gc3R5bGVUYXJnZXQuY29udGVudERvY3VtZW50LmhlYWQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0XG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgbWVtb1t0YXJnZXRdID0gc3R5bGVUYXJnZXQ7XG4gIH1cbiAgcmV0dXJuIG1lbW9bdGFyZ2V0XTtcbn1cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRCeVNlbGVjdG9yKGluc2VydCwgc3R5bGUpIHtcbiAgdmFyIHRhcmdldCA9IGdldFRhcmdldChpbnNlcnQpO1xuICBpZiAoIXRhcmdldCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGZpbmQgYSBzdHlsZSB0YXJnZXQuIFRoaXMgcHJvYmFibHkgbWVhbnMgdGhhdCB0aGUgdmFsdWUgZm9yIHRoZSAnaW5zZXJ0JyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG4gIH1cbiAgdGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0QnlTZWxlY3RvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgb3B0aW9ucy5zZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gIG9wdGlvbnMuaW5zZXJ0KGVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG4gIHJldHVybiBlbGVtZW50O1xufVxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzKHN0eWxlRWxlbWVudCkge1xuICB2YXIgbm9uY2UgPSB0eXBlb2YgX193ZWJwYWNrX25vbmNlX18gIT09IFwidW5kZWZpbmVkXCIgPyBfX3dlYnBhY2tfbm9uY2VfXyA6IG51bGw7XG4gIGlmIChub25jZSkge1xuICAgIHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJub25jZVwiLCBub25jZSk7XG4gIH1cbn1cbm1vZHVsZS5leHBvcnRzID0gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG4gIHZhciBjc3MgPSBcIlwiO1xuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQob2JqLnN1cHBvcnRzLCBcIikge1wiKTtcbiAgfVxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwiQG1lZGlhIFwiLmNvbmNhdChvYmoubWVkaWEsIFwiIHtcIik7XG4gIH1cbiAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBvYmoubGF5ZXIgIT09IFwidW5kZWZpbmVkXCI7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJAbGF5ZXJcIi5jb25jYXQob2JqLmxheWVyLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQob2JqLmxheWVyKSA6IFwiXCIsIFwiIHtcIik7XG4gIH1cbiAgY3NzICs9IG9iai5jc3M7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG4gIHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuICBpZiAoc291cmNlTWFwICYmIHR5cGVvZiBidG9hICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgY3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIi5jb25jYXQoYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSwgXCIgKi9cIik7XG4gIH1cblxuICAvLyBGb3Igb2xkIElFXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAgKi9cbiAgb3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbn1cbmZ1bmN0aW9uIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpIHtcbiAgLy8gaXN0YW5idWwgaWdub3JlIGlmXG4gIGlmIChzdHlsZUVsZW1lbnQucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBzdHlsZUVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQpO1xufVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGRvbUFQSShvcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUoKSB7fSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cbiAgICB9O1xuICB9XG4gIHZhciBzdHlsZUVsZW1lbnQgPSBvcHRpb25zLmluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICAgIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge1xuICAgICAgcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG4gICAgfVxuICB9O1xufVxubW9kdWxlLmV4cG9ydHMgPSBkb21BUEk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc3R5bGVUYWdUcmFuc2Zvcm0oY3NzLCBzdHlsZUVsZW1lbnQpIHtcbiAgaWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgIHN0eWxlRWxlbWVudC5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBzdHlsZVRhZ1RyYW5zZm9ybTsiLCJpbXBvcnQgJ0BpY29uZnUvc3ZnLWluamVjdCc7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgYnVpbGRIZWFkZXIgZnJvbSAnLi9jb21wb25lbnRzL2hlYWRlci9oZWFkZXInO1xuaW1wb3J0IGJ1aWxkTWFpbiBmcm9tICcuL2NvbXBvbmVudHMvbWFpbi9tYWluJztcbmltcG9ydCAnLi9hcHAuY3NzJztcblxuKCgpID0+IHtcbiAgY29uc3QgYnVpbGQgPSB7XG4gICAgaGVhZGVyOiBidWlsZEhlYWRlcixcbiAgICBtYWluOiBidWlsZE1haW4sXG4gIH07XG5cbiAgY29uc3QgYXBwID0ge1xuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgYXBwV3JhcHBlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgYXBwV3JhcHBlci5pZCA9ICdiYXR0bGVzaGlwX2FwcCc7XG5cbiAgICAgIGFwcFdyYXBwZXIuYXBwZW5kQ2hpbGQoYnVpbGQuaGVhZGVyKCkpO1xuICAgICAgYXBwV3JhcHBlci5hcHBlbmRDaGlsZChidWlsZC5tYWluKCkpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhcHBXcmFwcGVyKTtcbiAgICB9LFxuICB9O1xuXG4gIGFwcC5pbml0KCk7XG59KSgpO1xuIiwiIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBoZWFkZXJDb25maWcgZnJvbSAnLi9oZWFkZXIuY29uZmlnJztcbmltcG9ydCBuYXZiYXIgZnJvbSAnLi9uYXZiYXIvbmF2YmFyJztcbmltcG9ydCBub3RpZmljYXRpb25zIGZyb20gJy4vbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBoZWFkZXIgPSB7XG4gICAgaW5pdCgpIHt9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuaGVhZGVyID0gZWxlbWVudDtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7fSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBoZWFkZXJFbGVtZW50ID0gY3JlYXRlRWxlbWVudCgnaGVhZGVyJyk7XG4gICAgICBoZWFkZXJFbGVtZW50LmlkID0gJ2hlYWRlcic7XG4gICAgICBoZWFkZXJFbGVtZW50LmFwcGVuZENoaWxkKG5hdmJhcigpKTtcbiAgICAgIGhlYWRlckVsZW1lbnQuYXBwZW5kQ2hpbGQobm90aWZpY2F0aW9ucygpKTtcbiAgICAgIHRoaXMuY2FjaGVET00oaGVhZGVyRWxlbWVudCk7XG5cbiAgICAgIHJldHVybiBoZWFkZXJFbGVtZW50O1xuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIGhlYWRlci5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgSWNvbkdpdGh1YiBmcm9tICcuLi8uLi8uLi9hc3NldHMvaWNvbnMvZ2l0aHViX21hcmsvZ2l0aHViLW1hcmstd2hpdGUuc3ZnJztcblxuZXhwb3J0IGRlZmF1bHQgW1xuICB7XG4gICAgZWxlbWVudDogJ3VsJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICBjbGFzczogJ25hdl9sZWZ0JyxcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnIycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0gbmF2X2xvZ28nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnaW1nJyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBzcmM6ICcjJyxcbiAgICAgICAgICAgICAgICAgIC8vIG9ubG9hZDogJ1NWR0luamVjdCh0aGlzKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdoMScsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdCYXR0bGVzaGlwJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuICB7XG4gICAgZWxlbWVudDogJ3VsJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICBjbGFzczogJ25hdl9yaWdodCcsXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJyMnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtJyxcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdQbGFjZWhvbGRlcicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJyMnLFxuICAgICAgICAgICAgICBjbGFzczogJ25hdl9pdGVtJyxcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdQbGFjZWhvbGRlcicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS9taWtleUNvcy9iYXR0bGVzaGlwL3RyZWUvbWFpbicsXG4gICAgICAgICAgICAgIHRhcmdldDogJ19ibGFuaycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnaW1nJyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICBzcmM6IEljb25HaXRodWIsXG4gICAgICAgICAgICAgICAgICBvbmxvYWQ6ICdTVkdJbmplY3QodGhpcyknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnbGknLFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdhJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgaHJlZjogJ2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICB0YXJnZXQ6ICdfc2VsZicsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0gbGVhdmVfZ2FtZScsXG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnTGVhdmUgZ2FtZScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG5dO1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBuYXZiYXJDb25maWcgZnJvbSAnLi9uYXZiYXIuY29uZmlnJztcbmltcG9ydCAnLi4vLi4vLi4vc3R5bGVzL25hdmJhci5jc3MnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIGNvbnN0IG5hdmJhciA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5uYXZiYXIgPSBlbGVtZW50O1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHt9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IG5hdkVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KCduYXYnKTtcbiAgICAgIG5hdkVsZW1lbnQuaWQgPSAnbmF2YmFyJztcblxuICAgICAgbmF2YmFyQ29uZmlnLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3QgbmF2Q2hpbGQgPSBjcmVhdGVFbGVtZW50KGl0ZW0uZWxlbWVudCk7XG4gICAgICAgIG5hdkNoaWxkLnNldEF0dHJpYnV0ZXMoaXRlbS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgbmF2Q2hpbGQuc2V0Q2hpbGRyZW4oaXRlbS5jaGlsZHJlbik7XG4gICAgICAgIG5hdkVsZW1lbnQuYXBwZW5kQ2hpbGQobmF2Q2hpbGQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuY2FjaGVET00obmF2RWxlbWVudCk7XG4gICAgICByZXR1cm4gbmF2RWxlbWVudDtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBuYXZiYXIucmVuZGVyKCk7XG59O1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIGNvbnN0IG5vdGlmaWNhdGlvbnMgPSB7XG4gICAgaW5pdCgpIHtcbiAgICAgIHRoaXMudXBkYXRlTm90aWZpY2F0aW9uID0gdGhpcy51cGRhdGVOb3RpZmljYXRpb24uYmluZCh0aGlzKTtcbiAgICB9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMubm90aWZpY2F0aW9uTWVzc2FnZSA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignI25vdGlmaWNhdGlvbl9tZXNzYWdlJyk7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgcHViU3ViLnN1YnNjcmliZSgnbm90aWZ5JywgdGhpcy51cGRhdGVOb3RpZmljYXRpb24pO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3Qgbm90aWZpY2F0aW9uc0NvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3Qgbm90aWZpY2F0aW9uTWVzc2FnZSA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICBub3RpZmljYXRpb25zQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ25vdGlmaWNhdGlvbnNfY29udGFpbmVyJyk7XG4gICAgICBub3RpZmljYXRpb25NZXNzYWdlLnNldEF0dHJpYnV0ZXMoe1xuICAgICAgICBpZDogJ25vdGlmaWNhdGlvbl9tZXNzYWdlJyxcbiAgICAgICAgdGV4dENvbnRlbnQ6ICdQaWNrIGdhbWUgbW9kZScsXG4gICAgICB9KTtcblxuICAgICAgbm90aWZpY2F0aW9uc0NvbnRhaW5lci5hcHBlbmRDaGlsZChub3RpZmljYXRpb25NZXNzYWdlKTtcbiAgICAgIHRoaXMuY2FjaGVET00obm90aWZpY2F0aW9uc0NvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcblxuICAgICAgcmV0dXJuIG5vdGlmaWNhdGlvbnNDb250YWluZXI7XG4gICAgfSxcbiAgICB1cGRhdGVOb3RpZmljYXRpb24oc29tZXRoaW5nKSB7XG4gICAgICB0aGlzLm5vdGlmaWNhdGlvbk1lc3NhZ2UudGV4dENvbnRlbnQgPSBzb21ldGhpbmc7XG4gICAgfSxcbiAgfTtcblxuICBub3RpZmljYXRpb25zLmluaXQoKTtcbiAgcmV0dXJuIG5vdGlmaWNhdGlvbnMucmVuZGVyKCk7XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgW1xuICB7XG4gICAgZWxlbWVudDogJ2gyJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICB0ZXh0Q29udGVudDogJ0JhdHRsZXNoaXAnLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBlbGVtZW50OiAnc2VjdGlvbicsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgY2xhc3M6ICdnYW1lbW9kZV9idG5zJyxcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdidXR0b24nLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgY2xhc3M6ICdnYW1lbW9kZV9idG4gaHVtYW5faHVtYW4nLFxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdodW1hbiB2cyBodW1hbicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnYnV0dG9uJyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAnZ2FtZW1vZGVfYnRuIGh1bWFuX2NvbXB1dGVyJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnaHVtYW4gdnMgY29tcHV0ZXInLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuXTtcbiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgaG9tZUNvbmZpZyBmcm9tICcuL2hvbWUuY29uZmlnJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBob21lID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmhvbWUgPSBlbGVtZW50O1xuICAgICAgdGhpcy5oZWFkZXIgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvcignaDInKTtcbiAgICAgIHRoaXMubW9kZUJ0bnMgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvckFsbCgnLmdhbWVtb2RlX2J0bicpO1xuICAgICAgY29uc29sZS5sb2codGhpcy5ob21lKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMubW9kZUJ0bnMpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHRoaXMuc2V0R2FtZU1vZGUgPSB0aGlzLnNldEdhbWVNb2RlLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLm1vZGVCdG5zLmZvckVhY2goKGJ0bikgPT4gYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zZXRHYW1lTW9kZSkpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgaG9tZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgaG9tZUNvbnRhaW5lci5pZCA9ICdob21lJztcblxuICAgICAgaG9tZUNvbmZpZy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IGhvbWVDaGlsZCA9IGNyZWF0ZUVsZW1lbnQoaXRlbS5lbGVtZW50KTtcbiAgICAgICAgaWYgKGl0ZW0uYXR0cmlidXRlcykgaG9tZUNoaWxkLnNldEF0dHJpYnV0ZXMoaXRlbS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgaWYgKGl0ZW0uY2hpbGRyZW4pIGhvbWVDaGlsZC5zZXRDaGlsZHJlbihpdGVtLmNoaWxkcmVuKTtcbiAgICAgICAgaG9tZUNvbnRhaW5lci5hcHBlbmRDaGlsZChob21lQ2hpbGQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuY2FjaGVET00oaG9tZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIHJldHVybiBob21lQ29udGFpbmVyO1xuICAgIH0sXG4gICAgc2V0R2FtZU1vZGUoZSkge1xuICAgICAgY29uc3QgZ2FtZW1vZGUgPSAhZS5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC52YWx1ZS5pbmNsdWRlcygnY29tcHV0ZXInKTtcbiAgICAgIGNvbnNvbGUubG9nKGdhbWVtb2RlKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdtYWluX3JlbmRlcicsIGdhbWVtb2RlKTtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBob21lLnJlbmRlcigpO1xufTtcbiIsIiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgc2NyZWVuQ29udHJvbGxlciBmcm9tICcuLi9zY3JlZW4vc2NyZWVuQ29udHJvbGxlcic7XG5pbXBvcnQgbWFpbkNvbmZpZyBmcm9tICcuL21haW4uY29uZmlnJztcbmltcG9ydCBidWlsZEhvbWUgZnJvbSAnLi4vaG9tZS9ob21lJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGdhbWVJbml0IGZyb20gJy4uL3NjcmVlbi9zY3JlZW5Db250cm9sbGVyJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBidWlsZCA9IHtcbiAgICBob21lOiBidWlsZEhvbWUsXG4gICAgZ2FtZTogc2NyZWVuQ29udHJvbGxlcixcbiAgfTtcbiAgY29uc3QgbWFpbiA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5tYWluID0gZWxlbWVudDtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMubWFpbik7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpO1xuICAgICAgcHViU3ViLnN1YnNjcmliZSgnbWFpbl9yZW5kZXInLCB0aGlzLnJlbmRlcik7XG4gICAgfSxcbiAgICByZW5kZXIobW9kZSkge1xuICAgICAgaWYgKG1vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBtYWluQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIG1haW5Db250YWluZXIuaWQgPSAnbWFpbl9jb250ZW50JztcbiAgICAgICAgbWFpbkNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZC5ob21lKCkpO1xuICAgICAgICB0aGlzLmNhY2hlRE9NKG1haW5Db250YWluZXIpO1xuICAgICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIG1haW5Db250YWluZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1haW4uZmlyc3RFbGVtZW50Q2hpbGQucmVwbGFjZVdpdGgoYnVpbGQuZ2FtZShtb2RlKSk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gbWFpbi5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcblxuZXhwb3J0IGRlZmF1bHQgKHN0YXRlKSA9PiAoe1xuICAvLyBpbml0KCkge1xuICAvLyAgIHB1YlN1Yi5wdWJsaXNoKCdub3RpZnknLCAnUGxhY2Ugc2hpcHMnKTtcbiAgLy8gICB0aGlzLnN0YXJ0ID0gdGhpcy5zdGFydC5iaW5kKHRoaXMpO1xuICAvLyAgIHRoaXMucmVuZGVyU2hpcCA9IHRoaXMucmVuZGVyU2hpcC5iaW5kKHRoaXMpO1xuICAvLyB9LFxuICByZW5kZXJTaGlwKGVsZW1lbnQpIHtcbiAgICAvLyBUaGlzIHdpbGwgYXBwZW5kIHRvIHRoZSBjb250ZW50IGRpdlxuICAgIGNvbnNvbGUubG9nKGVsZW1lbnQpO1xuICB9LFxuICByZXNldChlKSB7XG4gICAgLy8gQ2xlYXJzIGJvYXJkXG4gIH0sXG4gIHN0YXJ0KGUpIHtcbiAgICAvLyBTZXQgdGhpcy5nYW1lUmVhZHkgdG8gdHJ1ZVxuICAgIC8vIFB1Ymxpc2ggc29tZXRoaW5nLi4uP1xuICAgIC8vIFJldmVhbCBwbGF5ZXIgdHdvJ3MgYm9hcmRcbiAgICB0aGlzLmdhbWVSZWFkeSA9IHRydWU7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgICB0aGlzLnJlbmRlcldhaXQoKTtcbiAgfSxcbiAgYm9hcmRIYW5kbGVyKGUpIHtcbiAgICBjb25zdCBidG4gPSBlLnRhcmdldDtcbiAgICBjb25zdCB4ID0gcGFyc2VJbnQoZS50YXJnZXQuZGF0YXNldC54KTtcbiAgICBjb25zdCB5ID0gcGFyc2VJbnQoZS50YXJnZXQuZGF0YXNldC55KTtcbiAgICBpZiAoIWlzTmFOKHgpIHx8ICFpc05hTih5KSkge1xuICAgICAgLy8gUGxhY2Ugc2hpcFxuICAgICAgY29uc29sZS5sb2coYFBsYWNpbmcgYSBzaGlwIHN0YXJ0aW5nIGF0IFske3h9LCAke3l9XWApO1xuICAgICAgdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbMiwgMl0sIDMsIGZhbHNlKTtcbiAgICAgIHRoaXMuZ2FtZS5wbGF5ZXJUd29Cb2FyZC5wbGFjZVNoaXAoWzYsIDJdLCAzLCBmYWxzZSk7XG4gICAgICB0aGlzLnJlbmRlclNoaXAoYnRuKTtcbiAgICB9XG4gIH0sXG59KTtcbiIsImltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGNvbXBvc2VHYW1lIGZyb20gJy4vY29tcG9zZUdhbWUnO1xuXG5leHBvcnQgZGVmYXVsdCAoc3RhdGUpID0+ICh7XG4gIHVuYmluZEV2ZW50cygpIHtcbiAgICB0aGlzLnBsYXllck9uZUJvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgIHRoaXMucGxheWVyVHdvQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gIH0sXG4gIHJlbmRlckF0dGFjayhjZWxsLCBjb29yZGluYXRlKSB7XG4gICAgLy8gRmluZCBidXR0b24gb24gdGhpcy5nYW1lLmFjdGl2ZVBsYXllcidzIGJvYXJkXG4gICAgLy8gZm9yIHdoaWNoIGl0J3MgZGF0YXNldC54ID09PSB4IGFuZCBkYXRhc2V0LnkgPT09IHlcblxuICAgIGNvbnNvbGUubG9nKGNlbGwpO1xuICAgIGNvbnNvbGUubG9nKGNvb3JkaW5hdGUpO1xuXG4gICAgaWYgKHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIgPT09IHRoaXMuZ2FtZS5wbGF5ZXJPbmUpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMucGxheWVyVHdvQm9hcmQpO1xuICAgICAgY29uc29sZS5sb2codGhpcy5wbGF5ZXJUd29Cb2FyZC5jaGlsZHJlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMucGxheWVyT25lQm9hcmQpO1xuICAgICAgY29uc29sZS5sb2codGhpcy5wbGF5ZXJPbmVCb2FyZC5jaGlsZHJlbik7XG4gICAgfVxuICAgIC8vIGlmIChjZWxsLm1pc3MpIHtcbiAgICAvLyAgIC8vIE1hcmsgYXMgbWlzc1xuICAgIC8vICAgYnRuLmNsYXNzTGlzdC5hZGQoJ21pc3MnKTtcbiAgICAvLyB9IGVsc2Uge1xuICAgIC8vICAgLy8gTWFyayBhcyBoaXRcbiAgICAvLyAgIGJ0bi5jbGFzc0xpc3QuYWRkKCdoaXQnKTtcbiAgICAvLyB9XG4gICAgLy8gQWRkcyBhIGNsYXNzIHRvIHRoZSBidG4sIG1pc3Mgb3IgaGl0XG4gIH0sXG4gIHJlbmRlcldhaXQoKSB7XG4gICAgbGV0IG5vdGlmaWNhdGlvbk1lc3NhZ2UgPSBgUGxheWVyIG9uZSdzIHR1cm4uYDtcbiAgICBpZiAodGhpcy5nYW1lLmFjdGl2ZVBsYXllciA9PT0gdGhpcy5nYW1lLnBsYXllck9uZSkge1xuICAgICAgLy8gSWYgZ2FtZS5hY3RpdmVQbGF5ZXIgaXMgTk9UIHBsYXllck9uZVxuICAgICAgLy8gUHV0ICd3YWl0JyBjbGFzcyBvbiB0aGUgcGxheWVyIG9uZSdzIGNvbnRhaW5lclxuICAgICAgY29uc29sZS5sb2coYFBsYXllciB0d28gYXR0YWNrcyBwbGF5ZXIgb25lYCk7XG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBZb3VyIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgT3Bwb25lbnQncyBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhgUGxheWVyIG9uZSBhdHRhY2tzIHBsYXllciB0d29gKTtcbiAgICAgIHRoaXMucGxheWVyT25lSGVhZGVyLnRleHRDb250ZW50ID0gYE9wcG9uZW50J3MgZ3JpZGA7XG4gICAgICB0aGlzLnBsYXllclR3b0hlYWRlci50ZXh0Q29udGVudCA9IGBZb3VyIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVDb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnd2FpdCcpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICBub3RpZmljYXRpb25NZXNzYWdlID0gYFBsYXllciB0d28ncyB0dXJuLmA7XG4gICAgfVxuXG4gICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsIG5vdGlmaWNhdGlvbk1lc3NhZ2UpO1xuICB9LFxuICByZW5kZXJHYW1lT3ZlcihtZXNzYWdlKSB7XG4gICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsIG1lc3NhZ2UpO1xuICAgIGNvbnNvbGUubG9nKGBnYW1lIGlzIG92ZXJgKTtcbiAgfSxcbiAgYm9hcmRIYW5kbGVyKGUpIHtcbiAgICBjb25zdCBidG4gPSBlLnRhcmdldDtcbiAgICBjb25zdCB4ID0gcGFyc2VJbnQoYnRuLmRhdGFzZXQueCk7XG4gICAgY29uc3QgeSA9IHBhcnNlSW50KGJ0bi5kYXRhc2V0LnkpO1xuICAgIGlmICghaXNOYU4oeCkgfHwgIWlzTmFOKHkpKSB7XG4gICAgICBjb25zdCBjZWxsID0gdGhpcy5nYW1lLmFjdGl2ZVBsYXllci5vcHBvbmVudEJvYXJkLmdldEJvYXJkQ2VsbChbeCwgeV0pO1xuICAgICAgaWYgKGNlbGwubWlzcyA9PT0gZmFsc2UgfHwgY2VsbC5oaXQgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuZ2FtZS5wbGF5Um91bmQoW3gsIHldKTtcbiAgICAgICAgLy8gdGhpcy5yZW5kZXJBdHRhY2soYnRuLCBjZWxsKTtcbiAgICAgICAgY29uc3QgZ2FtZVN0YXR1cyA9IHRoaXMuZ2FtZS5nZXRHYW1lU3RhdHVzKCk7XG4gICAgICAgIGlmIChnYW1lU3RhdHVzLnN0YXR1cykge1xuICAgICAgICAgIC8vIEdhbWUgaXMgb3ZlclxuICAgICAgICAgIHRoaXMudW5iaW5kRXZlbnRzKCk7XG4gICAgICAgICAgdGhpcy5yZW5kZXJHYW1lT3ZlcihnYW1lU3RhdHVzLm1lc3NhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucmVuZGVyV2FpdCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxufSk7XG4iLCJpbXBvcnQgR2FtZUNvbnRyb2xsZXIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9nYW1lQ29udHJvbGxlcic7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgY29tcG9zZUdhbWUgZnJvbSAnLi9jb21wb3NlR2FtZSc7XG5pbXBvcnQgcGxheUdhbWUgZnJvbSAnLi9wbGF5R2FtZSc7XG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcyc7XG5cbi8vIFRyeWluZyB0byBkZWNpZGUgd2hldGhlciBvciBub3QgaXQgaXMgYSBnb29kIGlkZWEgdG8gY3JlYXRlIGEgc2VwYXJhdGUgbW9kdWxlXG4vLyB0byBjb250cm9sIHRoZSBzY3JlZW4gYWZ0ZXIgcGxheWVycyBoYXZlIHBsYWNlZCBhbGwgdGhlaXIgc2hpcHNcbi8vIGFuZCBhZnRlciBhICdzdGFydCcgYnV0dG9uIGlzIGNsaWNrZWRcbmV4cG9ydCBkZWZhdWx0IChtb2RlKSA9PiB7XG4gIC8vIEJ1aWxkcyBlbXB0eSBib2FyZCBmb3IgcGxheWVycyB0byBwbGFjZSB0aGVpciBzaGlwc1xuICAvLyBtb2RlID09PSB0cnVlID0+IGh1bWFuIHZzIGh1bWFuXG4gIC8vIG1vZGUgPT09IGZhbHNlID0+IGh1bWFuIHZzIGNvbXB1dGVyXG5cbiAgY29uc3Qgc2NyZWVuQ29udHJvbGxlciA9IHtcbiAgICBnYW1lUmVhZHk6IGZhbHNlLFxuICAgIGdhbWU6IEdhbWVDb250cm9sbGVyKG1vZGUpLFxuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLmJvYXJkcyA9IHtcbiAgICAgICAgcGxheWVyT25lOiB0aGlzLmdhbWUucGxheWVyT25lQm9hcmQuYm9hcmQsXG4gICAgICAgIHBsYXllclR3bzogdGhpcy5nYW1lLnBsYXllclR3b0JvYXJkLmJvYXJkLFxuICAgICAgfTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdub3RpZnknLCAnUGxhY2Ugc2hpcHMnKTtcbiAgICAgIHRoaXMudXBkYXRlR2FtZVN0YXRlKGNvbXBvc2VHYW1lKTtcbiAgICAgIHRoaXMuc3RhcnQgPSB0aGlzLnN0YXJ0LmJpbmQodGhpcyk7XG4gICAgICB0aGlzLnJlbmRlclNoaXAgPSB0aGlzLnJlbmRlclNoaXAuYmluZCh0aGlzKTtcbiAgICB9LFxuICAgIHVwZGF0ZUdhbWVTdGF0ZShjYWxsYmFjaykge1xuICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBjYWxsYmFjaygpKTtcbiAgICB9LFxuICAgIGNhY2hlRE9NKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuZ2FtZUNvbnRhaW5lciA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLmJvYXJkQ29udGFpbmVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcjYm9hcmRfY29udGFpbmVyJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUNvbnRhaW5lciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl9vbmUnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX3R3bycpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl9vbmUgPiAuYm9hcmQnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfdHdvID4gLmJvYXJkJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl9vbmUgPiBoNCcpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfdHdvID4gaDQnKTtcbiAgICAgIHRoaXMuc3RhcnRCdG4gPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5nYW1lX3N0YXJ0X2J0bicpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVDZWxscyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBsYXllcl9vbmUgPiAuYm9hcmQgPiAuY2VsbCcpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29DZWxscyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBsYXllcl90d28gPiAuYm9hcmQgPiAuY2VsbCcpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIGlmICghdGhpcy5nYW1lUmVhZHkpIHRoaXMuc3RhcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLnN0YXJ0KTtcbiAgICAgIGlmICh0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICB0aGlzLnVwZGF0ZUdhbWVTdGF0ZShwbGF5R2FtZSk7XG4gICAgICAgIHRoaXMucmVuZGVyQXR0YWNrID0gdGhpcy5yZW5kZXJBdHRhY2suYmluZCh0aGlzKTtcbiAgICAgICAgcHViU3ViLnN1YnNjcmliZSgncmVuZGVyQXR0YWNrJywgdGhpcy5yZW5kZXJBdHRhY2spO1xuICAgICAgfVxuICAgICAgdGhpcy5ib2FyZEhhbmRsZXIgPSB0aGlzLmJvYXJkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5wbGF5ZXJPbmVCb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgfSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBnYW1lQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnc2VjdGlvbicpO1xuICAgICAgY29uc3QgYm9hcmRDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IHBsYXllck9uZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgcGxheWVyVHdvQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBwbGF5ZXJPbmVIZWFkZXIgPSBjcmVhdGVFbGVtZW50KCdoNCcpO1xuICAgICAgY29uc3QgcGxheWVyVHdvSGVhZGVyID0gY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgICAgIGNvbnN0IGdhbWVTdGFydENvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgZ2FtZVN0YXJ0QnRuID0gY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICBjb25zdCBnYW1lU3RhcnRCdG5UZXh0ID0gY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgZ2FtZVN0YXJ0QnRuVGV4dC50ZXh0Q29udGVudCA9ICdQbGF5JztcbiAgICAgIGdhbWVDb250YWluZXIuaWQgPSAnZ2FtZV9jb250YWluZXInO1xuICAgICAgYm9hcmRDb250YWluZXIuaWQgPSAnYm9hcmRfY29udGFpbmVyJztcbiAgICAgIHBsYXllck9uZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdwbGF5ZXJfb25lJyk7XG4gICAgICBwbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgncGxheWVyX3R3bycpO1xuICAgICAgcGxheWVyT25lSGVhZGVyLnRleHRDb250ZW50ID0gJ1lvdXIgZ3JpZCc7XG4gICAgICBwbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgT3Bwb25lbnQncyBncmlkYDtcbiAgICAgIGdhbWVTdGFydENvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdnYW1lX3N0YXJ0Jyk7XG4gICAgICBnYW1lU3RhcnRCdG4uY2xhc3NMaXN0LmFkZCgnZ2FtZV9zdGFydF9idG4nKTtcbiAgICAgIC8vIFJlbmRlcnMgcGxheWVycycgYm9hcmRzXG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJCb2FyZCh0aGlzLmJvYXJkcy5wbGF5ZXJPbmUpKTtcbiAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlckJvYXJkKHRoaXMuYm9hcmRzLnBsYXllclR3bykpO1xuICAgICAgcGxheWVyT25lQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllck9uZUhlYWRlcik7XG4gICAgICBwbGF5ZXJUd29Db250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyVHdvSGVhZGVyKTtcbiAgICAgIGJvYXJkQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllck9uZUNvbnRhaW5lcik7XG4gICAgICBib2FyZENvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJUd29Db250YWluZXIpO1xuICAgICAgZ2FtZVN0YXJ0QnRuLmFwcGVuZENoaWxkKGdhbWVTdGFydEJ0blRleHQpO1xuICAgICAgZ2FtZVN0YXJ0Q29udGFpbmVyLmFwcGVuZENoaWxkKGdhbWVTdGFydEJ0bik7XG4gICAgICBpZiAoIXRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIHBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd3YWl0Jyk7XG4gICAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZChnYW1lU3RhcnRDb250YWluZXIpO1xuICAgICAgfVxuICAgICAgZ2FtZUNvbnRhaW5lci5hcHBlbmRDaGlsZChib2FyZENvbnRhaW5lcik7XG4gICAgICBpZiAodGhpcy5nYW1lUmVhZHkpIHRoaXMuZ2FtZUNvbnRhaW5lci5yZXBsYWNlV2l0aChnYW1lQ29udGFpbmVyKTtcbiAgICAgIHRoaXMuY2FjaGVET00oZ2FtZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIGlmICghdGhpcy5nYW1lUmVhZHkpIHJldHVybiBnYW1lQ29udGFpbmVyO1xuICAgICAgLy8gRG9lcyBoYXZpbmcgdGhpcyBpZiBzdGF0ZW1lbnQgbWF0dGVyP1xuICAgIH0sXG4gICAgcmVuZGVyQm9hcmQoYm9hcmQpIHtcbiAgICAgIGNvbnN0IHBsYXllckJvYXJkID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBwbGF5ZXJCb2FyZC5jbGFzc0xpc3QuYWRkKCdib2FyZCcpO1xuICAgICAgYm9hcmQuZm9yRWFjaCgocm93LCB5KSA9PiB7XG4gICAgICAgIHJvdy5mb3JFYWNoKChjZWxsLCB4KSA9PiB7XG4gICAgICAgICAgY29uc3QgY2VsbEJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICAgIGNlbGxCdG4uc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICBjbGFzczogJ2NlbGwnLFxuICAgICAgICAgICAgWydkYXRhLXgnXTogeCArIDEsXG4gICAgICAgICAgICBbJ2RhdGEteSddOiByb3cubGVuZ3RoIC0geSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBOZWVkIHRvIHNob3cgb25seSBhY3RpdmVQbGF5ZXIncyBzaGlwc1xuICAgICAgICAgIC8vIE5lZWQgdG8gaGlkZSB0aGUgb3Bwb25lbnQncyBzaGlwcyB3aGVuIGFjdGl2ZVBsYXllciBjaGFuZ2VzXG4gICAgICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICBpZiAoY2VsbC5zaGlwKSB7XG4gICAgICAgICAgICAvLyBQcm9ibGVtLCBhbGxvd3Mgb3Bwb25lbnRzIHRvIGNoZWF0IGluIGEgYnJvd3NlciBkZXZlbG9wZXIgdG9vbHNcbiAgICAgICAgICAgIGNvbnN0IGNlbGxTaGlwID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBjZWxsU2hpcC5jbGFzc0xpc3QuYWRkKCdzaGlwJyk7XG4gICAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChjZWxsU2hpcCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNlbGxDb250ZW50LmNsYXNzTGlzdC5hZGQoJ2NlbGxfY29udGVudCcpO1xuICAgICAgICAgIGNlbGxCdG4uYXBwZW5kQ2hpbGQoY2VsbENvbnRlbnQpO1xuICAgICAgICAgIC8vIE5lZWQgdG8gY2hlY2sgZm9yIGxlZnQgYW5kIHRvcCBlZGdlcyBvZiBib2FyZFxuICAgICAgICAgIC8vIFRvIGNyZWF0ZSByb3cgYW5kIGNvbHVtbiBsYWJlbHNcbiAgICAgICAgICBpZiAoeCA9PT0gMCB8fCB5ID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByb3dNYXJrZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbE1hcmtlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgaWYgKHggPT09IDApIHtcbiAgICAgICAgICAgICAgcm93TWFya2VyLnNldEF0dHJpYnV0ZXMoeyBjbGFzczogJ3Jvd19tYXJrZXInLCB0ZXh0Q29udGVudDogYCR7eSArIDF9YCB9KTtcbiAgICAgICAgICAgICAgY2VsbEJ0bi5hcHBlbmRDaGlsZChyb3dNYXJrZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHkgPT09IDApIHtcbiAgICAgICAgICAgICAgY29sTWFya2VyLnNldEF0dHJpYnV0ZXMoe1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnY29sX21hcmtlcicsXG4gICAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6IGAke1N0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyB4KX1gLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgY2VsbEJ0bi5hcHBlbmRDaGlsZChjb2xNYXJrZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBwbGF5ZXJCb2FyZC5hcHBlbmRDaGlsZChjZWxsQnRuKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwbGF5ZXJCb2FyZDtcbiAgICB9LFxuICB9O1xuICBzY3JlZW5Db250cm9sbGVyLmluaXQoKTtcbiAgcmV0dXJuIHNjcmVlbkNvbnRyb2xsZXIucmVuZGVyKCk7XG59O1xuIiwiaW1wb3J0IEdhbWVib2FyZCBmcm9tICcuL2dhbWVib2FyZCc7XG5pbXBvcnQgUGxheWVyIGZyb20gJy4vcGxheWVyJztcbmltcG9ydCBwaXBlIGZyb20gJy4vcGlwZSc7XG5pbXBvcnQgaXNIdW1hbiBmcm9tICcuL2lzSHVtYW4nO1xuaW1wb3J0IGlzQ29tcHV0ZXIgZnJvbSAnLi9pc0NvbXB1dGVyJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi9wdWJTdWInO1xuLy8gTW9kdWxlIHRoYXQgY29udHJvbHMgdGhlIG1haW4gZ2FtZSBsb29wXG4vLyBGb3Igbm93IGp1c3QgcG9wdWxhdGUgZWFjaCBHYW1lYm9hcmQgd2l0aCBwcmVkZXRlcm1pbmVkIGNvb3JkaW5hdGVzLlxuLy8gWW91IGFyZSBnb2luZyB0byBpbXBsZW1lbnQgYSBzeXN0ZW0gZm9yIGFsbG93aW5nIHBsYXllcnMgdG8gcGxhY2UgdGhlaXIgc2hpcHMgbGF0ZXIuXG5leHBvcnQgZGVmYXVsdCAobW9kZSkgPT4ge1xuICAvLyBJZiBtb2RlIGlzIHRydWUgcGxheWVyIHR3byB3aWxsIGJlIGEgaHVtYW4sIGVsc2UgYSBjb21wdXRlclxuICAvLyBUaGUgZ2FtZSBsb29wIHNob3VsZCBzZXQgdXAgYSBuZXcgZ2FtZSBieSBjcmVhdGluZyBQbGF5ZXJzIGFuZCBHYW1lYm9hcmRzLlxuICAvLyAxLiBDcmVhdGUgZ2FtZWJvYXJkc1xuICAvLyAyLiBDcmVhdGUgcGxheWVycyBhbmQgcGFzcyBpbiB0aGVpciBnYW1lYm9hcmQgYW5kIHRoZSBvcHBvbmVudCdzIGdhbWVib2FyZC5cbiAgLy8gIERvIEkgb25seSBuZWVkIHRvIHBhc3MgdGhlIG9wcG9uZW50J3MgYm9hcmQ/XG4gIGxldCBhY3RpdmVQbGF5ZXI7XG4gIGNvbnN0IHBsYXllck9uZUJvYXJkID0gR2FtZWJvYXJkKCk7XG4gIGNvbnN0IHBsYXllclR3b0JvYXJkID0gR2FtZWJvYXJkKCk7XG5cbiAgY29uc3QgcGxheWVyT25lID0gcGlwZShQbGF5ZXIsIGlzSHVtYW4pKHBsYXllck9uZUJvYXJkLCBwbGF5ZXJUd29Cb2FyZCk7XG4gIGNvbnN0IHBsYXllclR3byA9IHBpcGUoUGxheWVyLCBtb2RlID8gaXNIdW1hbiA6IGlzQ29tcHV0ZXIpKHBsYXllclR3b0JvYXJkLCBwbGF5ZXJPbmVCb2FyZCk7XG5cbiAgY29uc3Qgc3dpdGNoUGxheWVycyA9IChwbGF5ZXIpID0+IHtcbiAgICBpZiAocGxheWVyKSB7XG4gICAgICAvLyBMb29raW5nIGludG8gTG9kYXNoIF8uaXNFcXVhbCgpXG4gICAgICAvLyBDb3VsZCBhZGQgYSB0dXJuIHByb3BlcnR5IHRvIHBsYXllciBvYmplY3QgdGhhdCB0YWtlcyBhIGJvb2xlYW5cbiAgICAgIGFjdGl2ZVBsYXllciA9IHBsYXllciA9PT0gcGxheWVyT25lID8gcGxheWVyVHdvIDogcGxheWVyT25lO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbml0aWFsbHkgc2V0IGEgcmFuZG9tIHBsYXllciBhcyB0aGUgYWN0aXZlIHBsYXllclxuICAgICAgY29uc3QgcGxheWVycyA9IFtwbGF5ZXJPbmUsIHBsYXllclR3b107XG4gICAgICBhY3RpdmVQbGF5ZXIgPSBwbGF5ZXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpXTtcbiAgICB9XG5cbiAgICAvLyBJZiBhY3RpdmVQbGF5ZXIgaXMgYSBjb21wdXRlci4uLlxuICAgIC8vIERvIHNvbWV0aGluZyBkaWZmZXJlbnQgaGVyZT9cbiAgICAvLyBDYWxsIHBsYXlSb3VuZCgpP1xuICB9O1xuXG4gIGNvbnN0IHBsYXlSb3VuZCA9IChjb29yZGluYXRlKSA9PiB7XG4gICAgLy8gQWxsb3cgYSBwbGF5ZXIgdG8gYXR0YWNrIGFnYWluIGlmIHRoZSBpbml0aWFsIGF0dGFjayBoaXRzIGEgc2hpcFxuICAgIGFjdGl2ZVBsYXllci5hdHRhY2soY29vcmRpbmF0ZSk7XG4gICAgLy8gSWYgZ2FtZSBpcyBub3Qgb3Zlciwgc3dpdGNoIHBsYXllcnNcbiAgICBpZiAoIWdldEdhbWVTdGF0dXMoKS5zdGF0dXMpIHN3aXRjaFBsYXllcnMoYWN0aXZlUGxheWVyKTtcbiAgfTtcblxuICBjb25zdCBnZXRHYW1lU3RhdHVzID0gKCkgPT4ge1xuICAgIGNvbnN0IHN0YXR1cyA9IHsgc3RhdHVzOiBwbGF5ZXJPbmVCb2FyZC5nZXRTdGF0dXMoKSB8fCBwbGF5ZXJUd29Cb2FyZC5nZXRTdGF0dXMoKSB9O1xuICAgIGlmIChzdGF0dXMuc3RhdHVzKSB7XG4gICAgICAvLyBHYW1lIGlzIG92ZXJcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBwbGF5ZXJPbmVCb2FyZC5nZXRTdGF0dXMoKSA/ICdQbGF5ZXIgdHdvIHdvbiEnIDogJ1BsYXllciBvbmUgd29uISc7XG4gICAgICBPYmplY3QuYXNzaWduKHN0YXR1cywgeyBtZXNzYWdlIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3RhdHVzO1xuICB9O1xuXG4gIHN3aXRjaFBsYXllcnMoKTtcbiAgcmV0dXJuIHtcbiAgICBzd2l0Y2hQbGF5ZXJzLFxuICAgIHBsYXlSb3VuZCxcbiAgICBnZXRHYW1lU3RhdHVzLFxuICAgIGdldCBhY3RpdmVQbGF5ZXIoKSB7XG4gICAgICByZXR1cm4gYWN0aXZlUGxheWVyO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllck9uZSgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJPbmU7XG4gICAgfSxcbiAgICBnZXQgcGxheWVyVHdvKCkge1xuICAgICAgcmV0dXJuIHBsYXllclR3bztcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJPbmVCb2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJPbmVCb2FyZDtcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJUd29Cb2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJUd29Cb2FyZDtcbiAgICB9LFxuICB9O1xufTtcbiIsImltcG9ydCBTaGlwIGZyb20gJy4uL2NvbnRhaW5lcnMvc2hpcCc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4vcHViU3ViJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICAvLyBLZWVwIHRyYWNrIG9mIG1pc3NlZCBhdHRhY2tzIHNvIHRoZXkgY2FuIGRpc3BsYXkgdGhlbSBwcm9wZXJseS5cbiAgLy8gQmUgYWJsZSB0byByZXBvcnQgd2hldGhlciBvciBub3QgYWxsIG9mIHRoZWlyIHNoaXBzIGhhdmUgYmVlbiBzdW5rLlxuICBjb25zdCBDZWxsID0gKHNoaXApID0+IHtcbiAgICByZXR1cm4gc2hpcFxuICAgICAgPyB7XG4gICAgICAgICAgc2hpcCxcbiAgICAgICAgICBoaXQ6IGZhbHNlLFxuICAgICAgICAgIGF0dGFjaygpIHtcbiAgICAgICAgICAgIHRoaXMuaGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc2hpcC5oaXQoKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgICA6IHtcbiAgICAgICAgICBtaXNzOiBmYWxzZSxcbiAgICAgICAgICBhdHRhY2soKSB7XG4gICAgICAgICAgICB0aGlzLm1pc3MgPSB0cnVlO1xuICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gIH07XG4gIGNvbnN0IGJvYXJkID0gbmV3IEFycmF5KDEwKS5maWxsKCkubWFwKCgpID0+IG5ldyBBcnJheSgxMCkuZmlsbCgpLm1hcCgoKSA9PiBDZWxsKCkpKTtcbiAgLy8gMTAgeCAxMCBncmlkXG4gIC8vIGNvbnN0IGJvYXJkID0gbmV3IEFycmF5KDEwKS5maWxsKCkubWFwKCgpID0+IG5ldyBBcnJheSgxMCkuZmlsbCh1bmRlZmluZWQpKTtcbiAgLypcbiAgW1xuICAgICAgICAxICAgICAyICAgICAzICAgICA0ICAgICA1ICAgICA2ICAgICA3ICAgICA4ICAgICA5ICAgICAxMFxuICAxMCAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCAwXG4gIDA5ICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDFcbiAgMDggIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgMlxuICAwNyAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCAzXG4gIDA2ICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDRcbiAgMDUgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgNVxuICAwNCAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCA2XG4gIDAzICBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF0sIDdcbiAgMDIgIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXSwgOFxuICAwMSAgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLCA5XG4gICAgICAgIDAgICAgIDEgICAgICAyICAgIDMgICAgIDQgICAgIDUgICAgIDYgICAgIDcgICAgIDggICAgIDlcbiAgXVxuICAqL1xuXG4gIGNvbnN0IHBhcnNlQ29vcmRpbmF0ZSA9IChbeCwgeV0pID0+IHtcbiAgICAvLyBQYXJzZXMgY29vcmRpbmF0ZSBpbnB1dHRlZCBieSB1c2VyIHN1Y2ggdGhhdFxuICAgIC8vIHRoZSB2YWx1ZSBwYWlycyBjYW4gYmUgdXNlZCBmb3IgYWNjZXNzaW5nIGVsZW1lbnRzXG4gICAgLy8gaW4gdGhlIHR3byBkaW1lbnNpb25hbCBhcnJheVxuICAgIHJldHVybiBbYm9hcmQubGVuZ3RoIC0geSwgeCAtIDFdO1xuICB9O1xuXG4gIGNvbnN0IGdlbmVyYXRlU2hpcENvb3JkaW5hdGVzID0gKFt4LCB5XSwgb3JpZW50YXRpb24sIHNoaXBMZW5ndGgpID0+IHtcbiAgICBjb25zdCBjb29yZGluYXRlcyA9IFtbeCwgeV1dO1xuXG4gICAgaWYgKG9yaWVudGF0aW9uKSB7XG4gICAgICAvLyBWZXJ0aWNhbFxuICAgICAgLy8gWzUsIDNdIGluIDJkIGFycmF5IHRlcm1zID0+IFs3XVs0XSwgWzhdWzRdLCBbOV1bNF1cbiAgICAgIGZvciAobGV0IGkgPSB4OyBpIDwgeCArIHNoaXBMZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjb29yZGluYXRlcy5wdXNoKFtpLCB5XSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhvcml6b250YWxcbiAgICAgIC8vIFs1LCAzXSBpbiAyZCBhcnJheSB0ZXJtcyA9PiBbN11bNF0sIFs3XVs1XSwgWzddWzZdXG4gICAgICBmb3IgKGxldCBpID0geTsgaSA8IHkgKyBzaGlwTGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29vcmRpbmF0ZXMucHVzaChbeCwgaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb29yZGluYXRlcztcbiAgfTtcblxuICBjb25zdCB2YWxpZGF0ZUNvb3JkaW5hdGUgPSAoeCwgeSkgPT4ge1xuICAgIHJldHVybiB4ID49IDAgJiYgeCA8IDEwICYmIHkgPj0gMCAmJiB5IDwgMTA7XG4gIH07XG5cbiAgY29uc3QgY2hlY2tCb2FyZCA9IChbeCwgeV0pID0+IHtcbiAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIHNoaXAgYXQgeCBhbmQgeVxuICAgIC8vIENoZWNrIGlmIGFsbCBzdXJyb3VuZGluZyBjb29yZGluYXRlcyBhcmUgdW5kZWZpbmVkXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgc2hpcCBjYW4gYmUgcGxhY2VcbiAgICBjb25zdCBib29sZWFuID0gdmFsaWRhdGVDb29yZGluYXRlKHgsIHkpO1xuICAgIGNvbnN0IGNoZWNrID0gW1xuICAgICAgW3gsIHkgKyAxXSxcbiAgICAgIFt4LCB5IC0gMV0sXG4gICAgICBbeCArIDEsIHldLFxuICAgICAgW3ggKyAxLCB5ICsgMV0sXG4gICAgICBbeCArIDEsIHkgLSAxXSxcbiAgICAgIFt4IC0gMSwgeV0sXG4gICAgICBbeCAtIDEsIHkgKyAxXSxcbiAgICAgIFt4IC0gMSwgeSAtIDFdLFxuICAgIF07XG4gICAgcmV0dXJuIGNoZWNrLmV2ZXJ5KChbYSwgYl0pID0+IHtcbiAgICAgIC8vIE5lZWQgdG8gY2hlY2sgaWYgYSBhbmQgYiBhcmUgd2l0aGluIHRoZSBib2FyZCdzIHNpemVcbiAgICAgIC8vIFRoZSB2YWx1ZSBvZiBhIGFuZCBiIGNhbiBvbmx5IGJlIGJldHdlZW4gZnJvbSAwIHRvIDkuXG4gICAgICAvLyBJdCBpcyBwb2ludGxlc3MgdG8gY2hlY2sgaWYgdGhlcmUgaXMgc3BhY2Ugd2hlbiBhIHNoaXAgaXMgcGxhY2VkIGF0IHRoZSBib3JkZXIgb2YgdGhlIGJvYXJkXG4gICAgICByZXR1cm4gdmFsaWRhdGVDb29yZGluYXRlKGEsIGIpID8gYm9vbGVhbiAmJiBib2FyZFthXVtiXS5zaGlwID09PSB1bmRlZmluZWQgOiBib29sZWFuO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IHBsYWNlU2hpcCA9IChjb29yZGluYXRlcywgc2hpcExlbmd0aCwgb3JpZW50YXRpb24pID0+IHtcbiAgICAvLyBCZSBhYmxlIHRvIHBsYWNlIHNoaXBzIGF0IHNwZWNpZmljIGNvb3JkaW5hdGVzIGJ5IGNhbGxpbmcgdGhlIHNoaXAgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICAvLyBTaGlwIG11c3QgZml0IG9uIGJvYXJkIGJhc2VkIG9uIGNvb3JkaW5hdGVzXG4gICAgLy8gIFdoYXQgaWYgc2hpcCBjYW4gYmUgcm90YXRlZD9cbiAgICAvLyBJZiBzaGlwIGlzIGhvcml6b250YWxcbiAgICAvLyAgSW52b2x2ZXMgY29sdW1uc1xuICAgIC8vIElmIHNoaXAgaXMgdmVydGljYWxcbiAgICAvLyAgSW52b2x2ZXMgcm93c1xuICAgIC8vIEZvciBleGFtcGxlLCBpZiBzaGlwIGlzIGEgbGVuZ3RoIG9mIDUgQU5EIGhvcml6b250YWxcbiAgICAvLyAgW3gsIHldID0+IFs1LCAzXSA9PiBwbGFjZVNoaXAoWzUsIDNdKVxuICAgIC8vICBTaGlwIHNob3VsZCBiZSBvbiBib2FyZCBmcm9tIFs1LCAzXSB0byBbOSwgM11cbiAgICAvLyAgQmFzZWQgb24gYXJyYXkgPT4gYm9hcmRbN11bNF0gdG8gYm9hcmRbN11bOF1cbiAgICAvLyBXaGF0IGlmIGNvb3JkaW5hdGVzIGFyZSBiYXNlZCBvbiBkcmFnZ2FibGUgc2hpcHM/XG4gICAgLy8gIEhvdyB0byBkZXRlcm1pbmUgaWYgdGhlIHNoaXAgd2lsbCBmaXQgb24gdGhlIGJvYXJkP1xuICAgIC8vICBIb3cgdG8gaGFuZGxlIGlmIHRoZSBzaGlwIGRvZXMgbm90IGZpdCBvbiB0aGUgYm9hcmQ/XG4gICAgLy8gV2hhdCBpZiB0aGVyZSBpcyBhIHNoaXAgYWxyZWFkeSBhdCBnaXZlbiBjb29yZGluYXRlcz9cbiAgICAvLyBBIHNoaXAgTVVTVCBiZSAxIGNvb3JkaW5hdGUgYXdheSBmcm9tIGFub3RoZXIgc2hpcFxuICAgIC8vIGNvbnN0IHggPSBib2FyZC5sZW5ndGggLSBjb29yZGluYXRlc1sxXTtcbiAgICAvLyBjb25zdCB5ID0gY29vcmRpbmF0ZXNbMF0gLSAxO1xuICAgIGNvbnN0IFt4LCB5XSA9IHBhcnNlQ29vcmRpbmF0ZShjb29yZGluYXRlcyk7XG4gICAgY29uc3QgbmV3U2hpcCA9IFNoaXAoc2hpcExlbmd0aCk7XG4gICAgY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMoW3gsIHldLCBvcmllbnRhdGlvbiwgbmV3U2hpcC5sZW5ndGgpO1xuICAgIGlmIChzaGlwQ29vcmRpbmF0ZXMuZXZlcnkoY2hlY2tCb2FyZCkpIHtcbiAgICAgIC8vIENoZWNrIGlmIHggYW5kIHkgYXJlIHdpdGhpbiB0aGUgYm9hcmQncyBzaXplXG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIHNoaXAgYXQgeCBhbmQgeVxuICAgICAgaWYgKG9yaWVudGF0aW9uKSB7XG4gICAgICAgIC8vIFZlcnRpY2FsXG4gICAgICAgIGZvciAobGV0IGkgPSB4OyBpIDwgeCArIG5ld1NoaXAubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICBib2FyZFtpXVt5XSA9IENlbGwobmV3U2hpcCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEhvcml6b250YWxcbiAgICAgICAgLy8gYm9hcmRbeF0uZmlsbChuZXdTaGlwLCB5LCB5ICsgbmV3U2hpcC5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0geTsgaSA8IHkgKyBuZXdTaGlwLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgYm9hcmRbeF1baV0gPSBDZWxsKG5ld1NoaXApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgYSBzaGlwIGF0IG9yIG5lYXIgY29vcmRpbmF0ZXMnKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3Qgc2hvdHMgPSBbXTtcbiAgY29uc3QgdmFsaWRhdGVBdHRhY2sgPSAoeCwgeSkgPT4ge1xuICAgIC8vIENoZWNrcyBpZiBjb29yZGluYXRlIGlzIHdpdGggdGhlIGJvYXJkIHNpemUgYW5kIGhhcyBub3QgYmVlbiBhdHRhY2tlZFxuICAgIGNvbnN0IFthLCBiXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgIHJldHVybiAhc2hvdHMuZmluZCgoW2EsIGJdKSA9PiBhID09PSB4ICYmIGIgPT09IHkpICYmIHZhbGlkYXRlQ29vcmRpbmF0ZShhLCBiKTtcbiAgfTtcblxuICBjb25zdCByZWNlaXZlQXR0YWNrID0gKFt4LCB5XSkgPT4ge1xuICAgIC8vIEhhdmUgYSByZWNlaXZlQXR0YWNrIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBwYWlyIG9mIGNvb3JkaW5hdGVzXG4gICAgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgYXR0YWNrIGhpdCBhIHNoaXBcbiAgICAvLyBUaGVuIHNlbmRzIHRoZSDigJhoaXTigJkgZnVuY3Rpb24gdG8gdGhlIGNvcnJlY3Qgc2hpcCwgb3IgcmVjb3JkcyB0aGUgY29vcmRpbmF0ZXMgb2YgdGhlIG1pc3NlZCBzaG90LlxuICAgIC8vIENhbiBJIHN0b3JlIHRoZSBtaXNzZWQgc2hvdHMgZGlyZWN0bHkgb24gdGhlIGJvYXJkP1xuICAgIC8vIEhvdyB0byBoYW5kbGUgaWYgYSBjb29yZGluYXRlIGhhcyBhbHJlYWR5IGJlZW4gYXR0YWNrZWQ/XG4gICAgLy8gIFRocm93IGFuIGVycm9yP1xuXG4gICAgY29uc3QgY2VsbCA9IGdldEJvYXJkQ2VsbChbeCwgeV0pO1xuICAgIGNvbnN0IGlzVmFsaWRBdHRhY2sgPSB2YWxpZGF0ZUF0dGFjayh4LCB5KTtcblxuICAgIGlmIChpc1ZhbGlkQXR0YWNrKSB7XG4gICAgICBjZWxsLmF0dGFjaygpO1xuICAgICAgc2hvdHMucHVzaChbeCwgeV0pO1xuICAgICAgLy8gUHVibGlzaCB0byB0aGUgc2NyZWVuQ29udHJvbGxlci5yZW5kZXJBdHRhY2sgbWV0aG9kP1xuICAgICAgY29uc29sZS5sb2coW3gsIHldKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdyZW5kZXJBdHRhY2snLCBjZWxsLCBbeCwgeV0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBnZXRTdGF0dXMgPSAoKSA9PiB7XG4gICAgLy8gUmVwb3J0cyB3aGV0aGVyIG9yIG5vdCBhbGwgb2YgdGhlaXIgc2hpcHMgaGF2ZSBiZWVuIHN1bmsuXG4gICAgY29uc3QgZmxhdEJvYXJkID0gYm9hcmQuZmxhdCgpLmZpbHRlcigoY2VsbCkgPT4gY2VsbC5zaGlwICE9PSB1bmRlZmluZWQpO1xuICAgIHJldHVybiBmbGF0Qm9hcmQuZXZlcnkoKGNlbGwpID0+IGNlbGwuc2hpcC5pc1N1bmsoKSk7XG4gIH07XG5cbiAgY29uc3QgZ2V0Qm9hcmRDZWxsID0gKFt4LCB5XSkgPT4ge1xuICAgIGNvbnN0IFthLCBiXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgIHJldHVybiBib2FyZFthXVtiXTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHJlY2VpdmVBdHRhY2ssXG4gICAgcGxhY2VTaGlwLFxuICAgIGdldFN0YXR1cyxcbiAgICBnZXRCb2FyZENlbGwsXG4gICAgZ2V0IGJvYXJkKCkge1xuICAgICAgcmV0dXJuIGJvYXJkO1xuICAgIH0sXG4gIH07XG59O1xuIiwiLy8gZXhwb3J0IGRlZmF1bHQgKHBsYXllcikgPT4gKHtcbi8vICAgLy8gTWFrZSB0aGUg4oCYY29tcHV0ZXLigJkgY2FwYWJsZSBvZiBtYWtpbmcgcmFuZG9tIHBsYXlzLlxuLy8gICAvLyBUaGUgQUkgZG9lcyBub3QgaGF2ZSB0byBiZSBzbWFydCxcbi8vICAgLy8gQnV0IGl0IHNob3VsZCBrbm93IHdoZXRoZXIgb3Igbm90IGEgZ2l2ZW4gbW92ZSBpcyBsZWdhbFxuLy8gICAvLyAoaS5lLiBpdCBzaG91bGRu4oCZdCBzaG9vdCB0aGUgc2FtZSBjb29yZGluYXRlIHR3aWNlKS5cbi8vICAgc2hvdHM6IFtdLFxuLy8gICBnZW5lcmF0ZVJhbmRvbUNvb3JkaW5hdGU6ICgpID0+IHtcbi8vICAgICAvLyBSZXR1cm5zIHJhbmRvbSBjb29yZGluYXRlIHdpdGggdmFsdWVzIGJldHdlZW4gMSBhbmQgMTBcbi8vICAgICBjb25zdCBjb29yZGluYXRlID0gW107XG4vLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpICs9IDEpIHtcbi8vICAgICAgIGNvb3JkaW5hdGUucHVzaChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCArIDEpKTtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuIGNvb3JkaW5hdGU7XG4vLyAgIH0sXG4vLyAgIGF0dGFjazogKCkgPT4ge1xuLy8gICAgIC8vIFJldHVybnMgYSByYW5kb20gdW5pcXVlIGNvb3JkaW5hdGUgdGhhdCBpcyBpbi1ib3VuZHMgb2YgdGhlIGJvYXJkXG4vLyAgICAgLy8gTm90ZSwgaWYgc2hvdHMubGVuZ3RoIGlzIDEwMCwgZ2FtZSB3aWxsIGJlIG92ZXJcbi8vICAgICAvLyBUaGVyZSBhcmUgb25seSAxMDAgY29vcmRpbmF0ZXMgdG8gYXR0YWNrXG4vLyAgICAgd2hpbGUgKHBsYXllci5zaG90cy5sZW5ndGggPCAxMDApIHtcbi8vICAgICAgIGxldCBbeCwgeV0gPSBwbGF5ZXIuZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4vLyAgICAgICBpZiAoIXBsYXllci5zaG90cy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkpIHtcbi8vICAgICAgICAgcGxheWVyLm9wcG9uZW50Qm9hcmQucmVjZWl2ZUF0dGFjayhbeCwgeV0pO1xuLy8gICAgICAgICBwbGF5ZXIuc2hvdHMucHVzaChbeCwgeV0pO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgfSxcbi8vIH0pO1xuXG5leHBvcnQgZGVmYXVsdCAocGxheWVyKSA9PiB7XG4gIC8vIE1ha2UgdGhlIOKAmGNvbXB1dGVy4oCZIGNhcGFibGUgb2YgbWFraW5nIHJhbmRvbSBwbGF5cy5cbiAgLy8gVGhlIEFJIGRvZXMgbm90IGhhdmUgdG8gYmUgc21hcnQsXG4gIC8vIEJ1dCBpdCBzaG91bGQga25vdyB3aGV0aGVyIG9yIG5vdCBhIGdpdmVuIG1vdmUgaXMgbGVnYWxcbiAgLy8gKGkuZS4gaXQgc2hvdWxkbuKAmXQgc2hvb3QgdGhlIHNhbWUgY29vcmRpbmF0ZSB0d2ljZSkuXG5cbiAgY29uc3Qgc2hvdHMgPSBbXTtcbiAgY29uc3QgZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlID0gKCkgPT4ge1xuICAgIC8vIFJldHVybnMgcmFuZG9tIGNvb3JkaW5hdGUgd2l0aCB2YWx1ZXMgYmV0d2VlbiAxIGFuZCAxMFxuICAgIGNvbnN0IGNvb3JkaW5hdGUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDI7IGkgKz0gMSkge1xuICAgICAgY29vcmRpbmF0ZS5wdXNoKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwICsgMSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29vcmRpbmF0ZTtcbiAgfTtcbiAgY29uc3QgYXR0YWNrID0gKCkgPT4ge1xuICAgIC8vIFJldHVybnMgYSByYW5kb20gdW5pcXVlIGNvb3JkaW5hdGUgdGhhdCBpcyBpbi1ib3VuZHMgb2YgdGhlIGJvYXJkXG4gICAgLy8gTm90ZSwgaWYgc2hvdHMubGVuZ3RoIGlzIDEwMCwgZ2FtZSB3aWxsIGJlIG92ZXJcbiAgICAvLyBUaGVyZSBhcmUgb25seSAxMDAgY29vcmRpbmF0ZXMgdG8gYXR0YWNrXG4gICAgd2hpbGUgKHNob3RzLmxlbmd0aCA8IDEwMCkge1xuICAgICAgbGV0IFt4LCB5XSA9IGdlbmVyYXRlUmFuZG9tQ29vcmRpbmF0ZSgpO1xuICAgICAgaWYgKCFzaG90cy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkpIHtcbiAgICAgICAgcGxheWVyLm9wcG9uZW50Qm9hcmQucmVjZWl2ZUF0dGFjayhbeCwgeV0pO1xuICAgICAgICBzaG90cy5wdXNoKFt4LCB5XSk7XG4gICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB7IGF0dGFjayB9O1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IChwbGF5ZXIpID0+ICh7XG4gIGF0dGFjazogKFt4LCB5XSkgPT4ge1xuICAgIHBsYXllci5vcHBvbmVudEJvYXJkLnJlY2VpdmVBdHRhY2soW3gsIHldKTtcbiAgICByZXR1cm4gW3gsIHldO1xuICB9LFxufSk7XG4iLCIvLyBBcnRpY2xlcyBhYm91dCBsb29zZWx5IGNvdXBsaW5nIG9iamVjdCBpbmhlcml0YW5jZSB3aXRoIGZhY3RvcnkgZnVuY3Rpb25zIGFuZCBwaXBlXG4vLyBodHRwczovL21lZGl1bS5jb20vZGFpbHlqcy9idWlsZGluZy1hbmQtY29tcG9zaW5nLWZhY3RvcnktZnVuY3Rpb25zLTUwZmU5MDE0MTM3NFxuLy8gaHR0cHM6Ly93d3cuZnJlZWNvZGVjYW1wLm9yZy9uZXdzL3BpcGUtYW5kLWNvbXBvc2UtaW4tamF2YXNjcmlwdC01YjA0MDA0YWM5MzcvXG4vLyBPYnNlcnZhdGlvbjogaWYgdGhlcmUgaXMgbm8gaW5pdGlhbCB2YWx1ZSwgdGhlIGZpcnN0IGZ1bmN0aW9uIGRvZXMgbm90IHJ1blxuZXhwb3J0IGRlZmF1bHQgKGluaXRpYWxGbiwgLi4uZm5zKSA9PlxuICAoLi4udmFsdWVzKSA9PiB7XG4gICAgcmV0dXJuIGZucy5yZWR1Y2UoKG9iaiwgZm4pID0+IHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgZm4ob2JqKSk7XG4gICAgfSwgaW5pdGlhbEZuKHZhbHVlcykpO1xuICB9O1xuIiwiLy8gUGxheWVycyBjYW4gdGFrZSB0dXJucyBwbGF5aW5nIHRoZSBnYW1lIGJ5IGF0dGFja2luZyB0aGUgZW5lbXkgR2FtZWJvYXJkLlxuLy8gVGhlIGdhbWUgaXMgcGxheWVkIGFnYWluc3QgdGhlIGNvbXB1dGVyLFxuXG4vLyBEb2VzIGVhY2ggcGxheWVyIGhhdmUgdGhlaXIgb3duIGdhbWVib2FyZD9cbi8vIERvZXMgZWFjaCBwbGF5ZXIgaGF2ZSBhY2Nlc3MgdG8gdGhlIG9wcG9uZW50J3MgZ2FtZWJvYXJkP1xuLy8gSG93IHRvIGRlY2lkZSBpZiBnYW1lIGlzIHBsYXllciB2cyBwbGF5ZXIgYW5kIHBsYXllciB2cyBjb21wdXRlcj9cbmV4cG9ydCBkZWZhdWx0IChbcGxheWVyQm9hcmQsIG9wcG9uZW50Qm9hcmRdKSA9PiB7XG4gIC8vIGNvbnN0IGJvYXJkID0gcGxheWVyQm9hcmQ7XG4gIC8vIERvIEkgbmVlZCB0byBkZWNsYXJlIHRoZSBjb25zdCB2YXJpYWJsZT9cbiAgY29uc3Qgc3RhdGUgPSB7XG4gICAgZ2V0IG9wcG9uZW50Qm9hcmQoKSB7XG4gICAgICByZXR1cm4gb3Bwb25lbnRCb2FyZDtcbiAgICB9LFxuICAgIGdldCBib2FyZCgpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJCb2FyZDtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBzdGF0ZTtcbn07XG5cbi8qXG5jb25zdCBwaXBlID0gKGluaXRpYWxGbiwgLi4uZm5zKSA9PiB7XG4gIHJldHVybiBmbnMucmVkdWNlKChvYmosIGZuKSA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqLCBmbihvYmopKTtcbiAgfSwgaW5pdGlhbEZuKCkpO1xufTtcblxuY29uc3QgQW5pbWFsID0gKCkgPT4ge1xuICBsZXQgd2VpZ2h0O1xuXG4gIGNvbnN0IHN0YXRlID0ge1xuICAgIHdlaWdodCxcbiAgICBpbmZvOiAoKSA9PiAoe1xuICAgICAgd2VpZ2h0OiBzdGF0ZS53ZWlnaHQsXG4gICAgICBsZWdzOiBzdGF0ZS5sZWdzLFxuICAgIH0pLFxuICB9O1xuICByZXR1cm4gc3RhdGU7XG59O1xuXG5jb25zdCBDYXQgPSAoc3RhdGUpID0+ICh7XG4gIHR5cGU6ICdjYXQnLFxuICBsZWdzOiA0LFxuICBzcGVhazogKCkgPT4gYG1lb3csIEkgaGF2ZSAke3N0YXRlLmxlZ3N9IGxlZ3NgLFxuICBwb29wOiAoKSA9PiBgbWVvdy4uLkkgYW0gcG9vcGluZy5gLFxuICBwb29wQWdhaW46ICgpID0+IGAke3N0YXRlLnBvb3AoKX0gbWVvdyBtZW93Li4uSSBhbSBwb29waW5nIG9uY2UgbW9yZWAsXG59KTtcblxuY29uc3QgQmlyZCA9IChzdGF0ZSkgPT4gKHtcbiAgdHlwZTogJ2JpcmQnLFxuICBsZWdzOiAyLFxuICBzcGVhazogKCkgPT4gYGNoaXJwLi4uY2hpcnAsIEkgaGF2ZSAke3N0YXRlLmxlZ3N9IGxlZ3NgLFxuICBwb29wOiAoKSA9PiBgY2hpcnAuLi5JIGFtIHBvb3BpbmcuYCxcbiAgcG9vcEFnYWluOiAoKSA9PiBgJHtzdGF0ZS5wb29wKCl9IGNoaXJwIGNoaXJwLi4uSSBhbSBwb29waW5nIG9uY2UgbW9yZWAsXG59KTtcblxuY29uc3QgV2l6YXJkID0gKHN0YXRlKSA9PiAoe1xuICBmaXJlYmFsbDogKCkgPT4gYCR7c3RhdGUudHlwZX0gaXMgY2FzdGluZyBmaXJlYmFsbGAsXG59KTtcblxuY29uc3QgTmVjcm9tYW5jZXIgPSAoc3RhdGUpID0+ICh7XG4gIGRlZmlsZURlYWQ6ICgpID0+IGAke3N0YXRlLnR5cGV9IGlzIGNhc3RpbmcgZGVmaWxlIGRlYWRgLFxufSk7XG5cbmNvbnN0IGNhdCA9IHBpcGUoQW5pbWFsLCBDYXQsIFdpemFyZCk7XG5jb25zdCBiaXJkID0gcGlwZShBbmltYWwsIEJpcmQsIE5lY3JvbWFuY2VyKTtcbmNvbnNvbGUubG9nKGNhdC5maXJlYmFsbCgpKTtcbmNvbnNvbGUubG9nKGNhdC5zcGVhaygpKTtcbmNvbnNvbGUubG9nKGNhdC5pbmZvKCkpO1xuY2F0LndlaWdodCA9IDEwO1xuY29uc29sZS5sb2coY2F0LmluZm8oKSk7XG5jb25zb2xlLmxvZyhiaXJkLmRlZmlsZURlYWQoKSk7XG5jb25zb2xlLmxvZyhiaXJkLnNwZWFrKCkpO1xuY29uc29sZS5sb2coYmlyZC5pbmZvKCkpO1xuYmlyZC53ZWlnaHQgPSAzO1xuY29uc29sZS5sb2coYmlyZC5pbmZvKCkpO1xuKi9cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgc3Vic2NyaWJlcnM6IHt9LFxuICBzdWJzY3JpYmUoc3Vic2NyaWJlciwgZm4pIHtcbiAgICAvLyBXaGVuIHdvdWxkIHlvdSB3YW50IHRvIHN1YnNjcmliZSBhIHNpbmdsZSBmdW5jdGlvbiBpbiB0aGUgc2FtZSBzdWJzY3JpYmVyIG1vcmUgdGhhbiBvbmNlP1xuICAgIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0gPSB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdIHx8IFtdO1xuICAgIGlmICghdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5maW5kKChoYW5kbGVyKSA9PiBoYW5kbGVyLm5hbWUgPT09IGZuLm5hbWUpKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLnB1c2goZm4pO1xuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0pO1xuICB9LFxuICB1bnN1YnNjcmliZShzdWJzY3JpYmVyLCBmbikge1xuICAgIGlmICh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLnNwbGljZSh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmluZGV4T2YoZm4pLCAxKTtcbiAgICAgIGlmICh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmxlbmd0aCA9PT0gMCkgZGVsZXRlIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl07XG4gICAgfVxuICB9LFxuICBwdWJsaXNoKHN1YnNjcmliZXIsIC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXSkge1xuICAgICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5mb3JFYWNoKChmbikgPT4gZm4oLi4uYXJncykpO1xuICAgIH1cbiAgfSxcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAoc2hpcExlbmd0aCkgPT4ge1xuICAvLyBQcm9wZXJ0aWVzOlxuICAvLyAgTGVuZ3RoXG4gIC8vICBOdW1iZXJzIG9mIHRpbWVzIGhpdFxuICAvLyAgU3VuayAodHJ1ZS9mYWxzZSlcbiAgLy8gTWV0aG9kczpcbiAgLy8gIEhpdCwgaW5jcmVhc2VzIHRoZSBudW1iZXIgb2Yg4oCYaGl0c+KAmSBpbiB5b3VyIHNoaXAuXG4gIC8vICBpc1N1bmsoKSBjYWxjdWxhdGVzIHdoZXRoZXIgYSBzaGlwIGlzIGNvbnNpZGVyZWQgc3Vua1xuICAvLyAgICBCYXNlZCBvbiBpdHMgbGVuZ3RoIGFuZCB0aGUgbnVtYmVyIG9mIGhpdHMgaXQgaGFzIHJlY2VpdmVkLlxuICAvLyAtIENhcnJpZXJcdCAgICA1XG4gIC8vIC0gQmF0dGxlc2hpcFx0ICA0XG4gIC8vIC0gRGVzdHJveWVyXHQgIDNcbiAgLy8gLSBTdWJtYXJpbmVcdCAgM1xuICAvLyAtIFBhdHJvbCBCb2F0XHQyXG4gIC8vIGNvbnN0IGxlbmd0aCA9IHNpemU7XG4gIC8vIEhvdyBvciB3aGVuIHRvIGluaXRpYWxpemUgYSBzaGlwJ3MgbGVuZ3RoXG4gIC8vIFdoYXQgZGV0ZXJtaW5lcyBhIHNoaXBzIGxlbmd0aD9cbiAgY29uc3QgbGVuZ3RoID0gc2hpcExlbmd0aDtcbiAgbGV0IG51bUhpdHMgPSAwO1xuICBsZXQgc3VuayA9IGZhbHNlO1xuICBjb25zdCBoaXQgPSAoKSA9PiB7XG4gICAgaWYgKCFzdW5rKSBudW1IaXRzICs9IDE7XG4gIH07XG4gIGNvbnN0IGlzU3VuayA9ICgpID0+IHtcbiAgICBzdW5rID0gbnVtSGl0cyA9PT0gbGVuZ3RoO1xuICAgIHJldHVybiBzdW5rO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgaGl0LFxuICAgIGlzU3VuayxcbiAgICBnZXQgbGVuZ3RoKCkge1xuICAgICAgcmV0dXJuIGxlbmd0aDtcbiAgICB9LFxuICB9O1xufTtcbiIsImNvbnN0IEJ1aWxkRWxlbWVudCA9IChzdGF0ZSkgPT4gKHtcbiAgc2V0QXR0cmlidXRlczogKGF0dHJpYnV0ZXMpID0+IHtcbiAgICBPYmplY3QuZW50cmllcyhhdHRyaWJ1dGVzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmIChrZXkgIT09ICd0ZXh0Q29udGVudCcpIHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzJykge1xuICAgICAgICAgIHN0YXRlLnNldENsYXNzTmFtZSh2YWx1ZS5zcGxpdCgvXFxzLykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0YXRlLnNldEF0dHJpYnV0ZShrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUuc2V0VGV4dENvbnRlbnQodmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBzZXRDbGFzc05hbWU6IChhcnJDbGFzcykgPT4ge1xuICAgIGFyckNsYXNzLmZvckVhY2goKGNsYXNzTmFtZSkgPT4gc3RhdGUuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpKTtcbiAgfSxcbiAgc2V0VGV4dENvbnRlbnQ6ICh0ZXh0KSA9PiB7XG4gICAgc3RhdGUudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB9LFxuICBzZXRDaGlsZHJlbjogKGNoaWxkcmVuKSA9PiB7XG4gICAgY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoY2hpbGQuZWxlbWVudCk7XG4gICAgICBpZiAoY2hpbGQuYXR0cmlidXRlcyAmJiBjaGlsZC5hdHRyaWJ1dGVzLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdPYmplY3QnKSB7XG4gICAgICAgIGNoaWxkRWxlbWVudC5zZXRBdHRyaWJ1dGVzKGNoaWxkLmF0dHJpYnV0ZXMpO1xuICAgICAgfVxuICAgICAgaWYgKGNoaWxkLmNoaWxkcmVuKSB7XG4gICAgICAgIC8vIFdoYXQgaWYgY2hpbGQgb2YgY2hpbGQuY2hpbGRyZW4gaGFzIGNoaWxkcmVuP1xuICAgICAgICBjaGlsZEVsZW1lbnQuc2V0Q2hpbGRyZW4oY2hpbGQuY2hpbGRyZW4pO1xuICAgICAgfVxuICAgICAgc3RhdGUuYXBwZW5kQ2hpbGQoY2hpbGRFbGVtZW50KTtcbiAgICB9KTtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZykge1xuICBjb25zdCBodG1sRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcblxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihodG1sRWxlbWVudCwgQnVpbGRFbGVtZW50KGh0bWxFbGVtZW50KSk7XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=