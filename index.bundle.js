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
  animation: linear 0.005s infinite shake;
}

.btns_container {
  display: flex;
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
`, "",{"version":3,"sources":["webpack://./src/styles/port.css"],"names":[],"mappings":"AAAA;EACE,aAAa;AACf;;AAEA;EACE,kBAAkB;EAClB,0BAA0B;EAC1B,aAAa;EACb,6BAA6B;AAC/B;;AAEA;EACE,UAAU;EACV,kBAAkB;EAClB,iCAAiC;EACjC,sBAAsB;EACtB,OAAO;EACP,MAAM;EACN,6BAA6B;AAC/B;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,6CAA6C;EAC7C,SAAS;EACT,QAAQ;AACV;;AAEA;EACE,uBAAuB;EACvB,mBAAmB;AACrB;;AAEA;EACE,qBAAqB;EACrB,mCAAmC;AACrC;;AAEA;EACE,iBAAiB;EACjB,uCAAuC;AACzC;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,oBAAoB;AACtB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,aAAa;AACf;;AAEA;EACE;IACE,UAAU;EACZ;;EAEA;IACE,SAAS;EACX;;EAEA;IACE,SAAS;EACX;AACF","sourcesContent":[".port_lines {\n  display: flex;\n}\n\n.port_ship {\n  position: relative;\n  border: 1px dotted #b2b2b9;\n  margin: 0.5em;\n  /* box-sizing: content-box; */\n}\n\n.ship_box {\n  z-index: 2;\n  position: absolute;\n  background: rgba(0, 0, 255, 0.05);\n  border: 2px solid #00f;\n  left: 0;\n  top: 0;\n  /* box-sizing: content-box; */\n}\n\n.ship_box:hover {\n  cursor: move;\n}\n\n.cell_content > .ship_box {\n  /* Comment out if using box-sizing: content */\n  left: -4%;\n  top: -4%;\n}\n\n.ship_box.dragging.ship_box_transparent {\n  background: transparent;\n  border: transparent;\n}\n\n.ship_box_placeholder {\n  border-color: #40bf44;\n  background: rgba(64, 191, 68, 0.05);\n}\n\n.rotate_error {\n  border-color: red;\n  animation: linear 0.005s infinite shake;\n}\n\n.btns_container {\n  display: flex;\n}\n\n.reset_btn.inactive {\n  pointer-events: none;\n}\n\n.reset_btn.inactive > span {\n  opacity: 0.5;\n}\n\n.random_btn {\n  display: none;\n}\n\n.ready_btn.inactive {\n  display: none;\n}\n\n@keyframes shake {\n  0% {\n    left: -5px;\n  }\n\n  50% {\n    left: 0px;\n  }\n\n  100% {\n    left: 5px;\n  }\n}\n"],"sourceRoot":""}]);
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

.player_two.inactive {
  display: none;
}

.play_btn.inactive {
  display: none;
}

.play_btn {
  display: block;
  position: absolute;
  top: 20%;
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
  height: inherit;
  background-color: cornflowerblue;
}

.cell > .cell_content > .blank_wrapper {
  display: block;
  /* width: 100%;
  height: 100%; */
  z-index: -1;
}

.cell.done > .cell_content > .blank_wrapper {
  /* border: 2px solid red; */
}

.cell.hit > .cell_content > .blank_wrapper::before,
.cell.hit > .cell_content > .blank_wrapper::after {
  content: '';
  position: absolute;
  background: red;
  left: 50%;
  width: 2px;
  top: -25%;
  height: 150%;
  z-index: -1;
}

.cell.done > .cell_content > .ship {
  border: 2px solid red;
}

#boards_container > * > .board > * > .cell.hit > .cell_content > .blank_wrapper::before {
  transform: rotate(45deg);
  margin-top: -1px;
}

#boards_container > * > .board > * > .cell.hit > .cell_content > .blank_wrapper::after {
  transform: rotate(-45deg);
  margin-top: 1px;
}

/* #board_container > *:not(.wait) > .board > .board_row > .cell.hit > .cell_content > .ship, */
#boards_container > * > .board > * > .cell.hit.done > .cell_content > .ship {
  /* Original */
  /* border: 2px solid red; */
}

#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before,
#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::after {
  /* Original */
  content: '';
  position: absolute;
  background: red;
  left: 50%;
  width: 2px;
  top: -25%;
  height: 150%;
  z-index: 2;
}

#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before {
  /* Original */
  transform: rotate(45deg);
  margin-top: -1px;
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

#boards_container > * > .board > * > .cell.miss > .cell_content {
  /* background-color: grey; */
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
`, "",{"version":3,"sources":["webpack://./src/styles/screenController.css"],"names":[],"mappings":"AAAA;EACE,eAAe;EACf,aAAa;EACb,SAAS;EACT,iBAAiB;AACnB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,eAAe;EACf,YAAY;AACd;;AAEA;EACE,6BAA6B;AAC/B;;AAEA;;EAEE,kBAAkB;EAClB,kBAAkB;AACpB;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,aAAa;AACf;;AAEA;EACE,cAAc;EACd,kBAAkB;EAClB,QAAQ;AACV;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE,UAAU;EACV,WAAW;EACX,kBAAkB;EAClB,uBAAuB;EACvB,0BAA0B;EAC1B,uBAAuB;EACvB,6BAA6B;AAC/B;;AAEA;EACE;;;GAGC;EACD,oBAAoB;EACpB,eAAe;EACf,gCAAgC;AAClC;;AAEA;EACE,cAAc;EACd;iBACe;EACf,WAAW;AACb;;AAEA;EACE,2BAA2B;AAC7B;;AAEA;;EAEE,WAAW;EACX,kBAAkB;EAClB,eAAe;EACf,SAAS;EACT,UAAU;EACV,SAAS;EACT,YAAY;EACZ,WAAW;AACb;;AAEA;EACE,qBAAqB;AACvB;;AAEA;EACE,wBAAwB;EACxB,gBAAgB;AAClB;;AAEA;EACE,yBAAyB;EACzB,eAAe;AACjB;;AAEA,+FAA+F;AAC/F;EACE,aAAa;EACb,2BAA2B;AAC7B;;AAEA;;EAEE,aAAa;EACb,WAAW;EACX,kBAAkB;EAClB,eAAe;EACf,SAAS;EACT,UAAU;EACV,SAAS;EACT,YAAY;EACZ,UAAU;AACZ;;AAEA;EACE,aAAa;EACb,wBAAwB;EACxB,gBAAgB;AAClB;;AAEA;EACE,aAAa;EACb,yBAAyB;EACzB,eAAe;AACjB;;AAEA;EACE,kBAAkB;EAClB,QAAQ;EACR,SAAS;EACT,WAAW;EACX,UAAU;EACV,gBAAgB;EAChB,kBAAkB;EAClB,gBAAgB;EAChB,iBAAiB;EACjB,UAAU;AACZ;;AAEA;EACE,4BAA4B;EAC5B,yBAAyB;AAC3B;;AAEA;EACE,kBAAkB;EAClB,YAAY;EACZ,aAAa;EACb,UAAU;EACV,MAAM;EACN,mBAAmB;EACnB,WAAW;AACb;;AAEA;EACE,kBAAkB;EAClB,SAAS;EACT,kBAAkB;EAClB,WAAW;EACX,WAAW;AACb","sourcesContent":["#boards_container {\n  margin-top: 4em;\n  display: flex;\n  gap: 8rem;\n  user-select: none;\n}\n\n#boards_container > * > .board > * {\n  display: flex;\n}\n\n#boards_container > *.wait > *:not(.game_play) {\n  opacity: 0.4;\n}\n\n#boards_container > * > .board > * > button {\n  cursor: pointer;\n  border: none;\n}\n\n#boards_container > *:not(.wait) > * > * > .cell > .cell_content > .ship {\n  background-color: transparent;\n}\n\n.player_one,\n.player_two {\n  position: relative;\n  width: min-content;\n}\n\n.player_two.inactive {\n  display: none;\n}\n\n.play_btn.inactive {\n  display: none;\n}\n\n.play_btn {\n  display: block;\n  position: absolute;\n  top: 20%;\n}\n\n.play_btn > button {\n  font-size: 4rem;\n}\n\n.cell > * {\n  width: 2em;\n  height: 2em;\n  position: relative;\n  background-color: white;\n  /* pointer-events: none; */\n  border: 1px solid black;\n  /* box-sizing: content-box; */\n}\n\n.cell > .cell_content > .ship {\n  /*\n  Show ship during placing ships phase\n  Show only active player's ship when game is in play\n  */\n  pointer-events: none;\n  height: inherit;\n  background-color: cornflowerblue;\n}\n\n.cell > .cell_content > .blank_wrapper {\n  display: block;\n  /* width: 100%;\n  height: 100%; */\n  z-index: -1;\n}\n\n.cell.done > .cell_content > .blank_wrapper {\n  /* border: 2px solid red; */\n}\n\n.cell.hit > .cell_content > .blank_wrapper::before,\n.cell.hit > .cell_content > .blank_wrapper::after {\n  content: '';\n  position: absolute;\n  background: red;\n  left: 50%;\n  width: 2px;\n  top: -25%;\n  height: 150%;\n  z-index: -1;\n}\n\n.cell.done > .cell_content > .ship {\n  border: 2px solid red;\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .blank_wrapper::before {\n  transform: rotate(45deg);\n  margin-top: -1px;\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .blank_wrapper::after {\n  transform: rotate(-45deg);\n  margin-top: 1px;\n}\n\n/* #board_container > *:not(.wait) > .board > .board_row > .cell.hit > .cell_content > .ship, */\n#boards_container > * > .board > * > .cell.hit.done > .cell_content > .ship {\n  /* Original */\n  /* border: 2px solid red; */\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before,\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::after {\n  /* Original */\n  content: '';\n  position: absolute;\n  background: red;\n  left: 50%;\n  width: 2px;\n  top: -25%;\n  height: 150%;\n  z-index: 2;\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::before {\n  /* Original */\n  transform: rotate(45deg);\n  margin-top: -1px;\n}\n\n#boards_container > * > .board > * > .cell.hit > .cell_content > .ship::after {\n  /* Original */\n  transform: rotate(-45deg);\n  margin-top: 1px;\n}\n\n#boards_container > * > .board > * > .cell.miss > .cell_content > .blank_wrapper {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  height: 4px;\n  width: 4px;\n  background: #333;\n  border-radius: 50%;\n  margin-top: -2px;\n  margin-left: -2px;\n  z-index: 1;\n}\n\n#boards_container > * > .board > * > .cell.miss > .cell_content {\n  /* background-color: grey; */\n  background-color: #e1e3e8;\n}\n\n.cell_content > .row_marker {\n  position: absolute;\n  height: 100%;\n  display: flex;\n  left: -2em;\n  top: 0;\n  align-items: center;\n  z-index: -1;\n}\n\n.cell_content > .col_marker {\n  position: absolute;\n  top: -2em;\n  text-align: center;\n  width: 100%;\n  z-index: -1;\n}\n"],"sourceRoot":""}]);
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
    updateNotification(text) {
      this.notificationMessage.textContent = text;
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
    let notificationMessage = `Player one's turn.`;
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
      _containers_pubSub__WEBPACK_IMPORTED_MODULE_2__["default"].publish('notify', 'Place ships');
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
      if (this.gameReady) this.gameContainer.replaceWith(gameContainer);
      this.cacheDOM(gameContainer);
      this.bindEvents();
      if (!this.gameReady) return gameContainer;
      // Does having this if statement matter?
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx5REFBeUQsbUJBQW1CO0FBQzVFOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsa0JBQWtCO0FBQ2pDLGVBQWUsUUFBUTtBQUN2QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVB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O0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSw0QkFBNEI7QUFDNUI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPLGtHQUFrRyxVQUFVLFVBQVUsVUFBVSxZQUFZLE9BQU8sS0FBSyxVQUFVLE1BQU0sS0FBSyxVQUFVLE1BQU0sS0FBSyxVQUFVLFVBQVUsTUFBTSxLQUFLLFlBQVksT0FBTyxNQUFNLFlBQVksYUFBYSxPQUFPLEtBQUssVUFBVSxNQUFNLEtBQUssVUFBVSxNQUFNLEtBQUssVUFBVSxZQUFZLFdBQVcsTUFBTSxLQUFLLFVBQVUsT0FBTyxLQUFLLFVBQVUsVUFBVSxZQUFZLGFBQWEsYUFBYSxhQUFhLGFBQWEsT0FBTyxLQUFLLE9BQU8sS0FBSyxZQUFZLFdBQVcsWUFBWSxPQUFPLEtBQUssVUFBVSxLQUFLLE1BQU0sVUFBVSxNQUFNLEtBQUssWUFBWSxPQUFPLE1BQU0sVUFBVSxZQUFZLFdBQVcsVUFBVSxVQUFVLFVBQVUsVUFBVSxVQUFVLE1BQU0sS0FBSyxZQUFZLE9BQU8sS0FBSyxZQUFZLGFBQWEsT0FBTyxLQUFLLFlBQVksV0FBVyxPQUFPLFlBQVksTUFBTSxVQUFVLFlBQVksT0FBTyxNQUFNLFVBQVUsVUFBVSxZQUFZLFdBQVcsVUFBVSxVQUFVLFVBQVUsVUFBVSxVQUFVLE1BQU0sS0FBSyxVQUFVLFlBQVksYUFBYSxP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QTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSw4QkFBOEIsd0RBQUs7QUFDbkMsTUFBTSwwREFBTTtBQUNaLEtBQUs7QUFDTDtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNLDBEQUFNO0FBQ1osS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0EsQ0FBQyxFQUFDOzs7Ozs7Ozs7Ozs7Ozs7O0FDM1FGLGlFQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7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QUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSCxDQUFDLEVBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7QUNwQkYsaUVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsQ0FBQyxFQUFDOzs7Ozs7Ozs7Ozs7Ozs7OztBQ3ZDd0M7O0FBRTFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBLFVBQVU7QUFDVixrQ0FBa0MseURBQVk7QUFDOUMsVUFBVTtBQUNWO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHO0FBQ0gsQ0FBQzs7QUFFYztBQUNmOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7QUNoREEsaUVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0gsQ0FBQyxFQUFDOztBQUVGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL0BpY29uZnUvc3ZnLWluamVjdC9kaXN0L3N2Zy1pbmplY3QuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9hcHAuY3NzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL2hlYWRlci5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaG9tZS5jc3MiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbmF2YmFyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9ub3RpZmljYXRpb25zLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9wb3J0LmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9hcHAuY3NzP2E2NzIiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvaGVhZGVyLmNzcz9lNjhiIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL2hvbWUuY3NzPzRiNTEiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvbmF2YmFyLmNzcz9jMWRiIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvc3R5bGVzL25vdGlmaWNhdGlvbnMuY3NzPzJkMmQiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9zdHlsZXMvcG9ydC5jc3M/MzRlZiIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL3N0eWxlcy9zY3JlZW5Db250cm9sbGVyLmNzcz8zNDFlIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9hcHAuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL2JvYXJkL2JvYXJkLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9oZWFkZXIvaGVhZGVyLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL2hlYWRlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25hdmJhci9uYXZiYXIuY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9oZWFkZXIvbmF2YmFyL25hdmJhci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaGVhZGVyL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9ucy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaG9tZS9ob21lLmNvbmZpZy5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvaG9tZS9ob21lLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9tYWluL21haW4uY29uZmlnLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9tYWluL21haW4uanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3BvcnQvcG9ydC5jb25maWcuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3BvcnQvcG9ydC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbXBvbmVudHMvc2NyZWVuL2NvbXBvc2VHYW1lLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29tcG9uZW50cy9zY3JlZW4vcGxheUdhbWUuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb21wb25lbnRzL3NjcmVlbi9zY3JlZW5Db250cm9sbGVyLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9nYW1lQ29udHJvbGxlci5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvZ2FtZWJvYXJkLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9pc0NvbXB1dGVyLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9pc0h1bWFuLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9waXBlLmpzIiwid2VicGFjazovL21vZHVsZS13ZWJwYWNrLXN0YXJ0ZXIvLi9zcmMvY29udGFpbmVycy9wbGF5ZXIuanMiLCJ3ZWJwYWNrOi8vbW9kdWxlLXdlYnBhY2stc3RhcnRlci8uL3NyYy9jb250YWluZXJzL3B1YlN1Yi5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2NvbnRhaW5lcnMvc2hpcC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2hlbHBlcnMvY3JlYXRlRWxlbWVudC5qcyIsIndlYnBhY2s6Ly9tb2R1bGUtd2VicGFjay1zdGFydGVyLy4vc3JjL2hlbHBlcnMvZ2VuZXJhdGVVVUlELmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU1ZHSW5qZWN0IC0gVmVyc2lvbiAxLjIuM1xuICogQSB0aW55LCBpbnR1aXRpdmUsIHJvYnVzdCwgY2FjaGluZyBzb2x1dGlvbiBmb3IgaW5qZWN0aW5nIFNWRyBmaWxlcyBpbmxpbmUgaW50byB0aGUgRE9NLlxuICpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9pY29uZnUvc3ZnLWluamVjdFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxOCBJTkNPUlMsIHRoZSBjcmVhdG9ycyBvZiBpY29uZnUuY29tXG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9pY29uZnUvc3ZnLWluamVjdC9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKi9cblxuKGZ1bmN0aW9uKHdpbmRvdywgZG9jdW1lbnQpIHtcbiAgLy8gY29uc3RhbnRzIGZvciBiZXR0ZXIgbWluaWZpY2F0aW9uXG4gIHZhciBfQ1JFQVRFX0VMRU1FTlRfID0gJ2NyZWF0ZUVsZW1lbnQnO1xuICB2YXIgX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV8gPSAnZ2V0RWxlbWVudHNCeVRhZ05hbWUnO1xuICB2YXIgX0xFTkdUSF8gPSAnbGVuZ3RoJztcbiAgdmFyIF9TVFlMRV8gPSAnc3R5bGUnO1xuICB2YXIgX1RJVExFXyA9ICd0aXRsZSc7XG4gIHZhciBfVU5ERUZJTkVEXyA9ICd1bmRlZmluZWQnO1xuICB2YXIgX1NFVF9BVFRSSUJVVEVfID0gJ3NldEF0dHJpYnV0ZSc7XG4gIHZhciBfR0VUX0FUVFJJQlVURV8gPSAnZ2V0QXR0cmlidXRlJztcblxuICB2YXIgTlVMTCA9IG51bGw7XG5cbiAgLy8gY29uc3RhbnRzXG4gIHZhciBfX1NWR0lOSkVDVCA9ICdfX3N2Z0luamVjdCc7XG4gIHZhciBJRF9TVUZGSVggPSAnLS1pbmplY3QtJztcbiAgdmFyIElEX1NVRkZJWF9SRUdFWCA9IG5ldyBSZWdFeHAoSURfU1VGRklYICsgJ1xcXFxkKycsIFwiZ1wiKTtcbiAgdmFyIExPQURfRkFJTCA9ICdMT0FEX0ZBSUwnO1xuICB2YXIgU1ZHX05PVF9TVVBQT1JURUQgPSAnU1ZHX05PVF9TVVBQT1JURUQnO1xuICB2YXIgU1ZHX0lOVkFMSUQgPSAnU1ZHX0lOVkFMSUQnO1xuICB2YXIgQVRUUklCVVRFX0VYQ0xVU0lPTl9OQU1FUyA9IFsnc3JjJywgJ2FsdCcsICdvbmxvYWQnLCAnb25lcnJvciddO1xuICB2YXIgQV9FTEVNRU5UID0gZG9jdW1lbnRbX0NSRUFURV9FTEVNRU5UX10oJ2EnKTtcbiAgdmFyIElTX1NWR19TVVBQT1JURUQgPSB0eXBlb2YgU1ZHUmVjdCAhPSBfVU5ERUZJTkVEXztcbiAgdmFyIERFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICB1c2VDYWNoZTogdHJ1ZSxcbiAgICBjb3B5QXR0cmlidXRlczogdHJ1ZSxcbiAgICBtYWtlSWRzVW5pcXVlOiB0cnVlXG4gIH07XG4gIC8vIE1hcCBvZiBJUkkgcmVmZXJlbmNlYWJsZSB0YWcgbmFtZXMgdG8gcHJvcGVydGllcyB0aGF0IGNhbiByZWZlcmVuY2UgdGhlbS4gVGhpcyBpcyBkZWZpbmVkIGluXG4gIC8vIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9saW5raW5nLmh0bWwjcHJvY2Vzc2luZ0lSSVxuICB2YXIgSVJJX1RBR19QUk9QRVJUSUVTX01BUCA9IHtcbiAgICBjbGlwUGF0aDogWydjbGlwLXBhdGgnXSxcbiAgICAnY29sb3ItcHJvZmlsZSc6IE5VTEwsXG4gICAgY3Vyc29yOiBOVUxMLFxuICAgIGZpbHRlcjogTlVMTCxcbiAgICBsaW5lYXJHcmFkaWVudDogWydmaWxsJywgJ3N0cm9rZSddLFxuICAgIG1hcmtlcjogWydtYXJrZXInLCAnbWFya2VyLWVuZCcsICdtYXJrZXItbWlkJywgJ21hcmtlci1zdGFydCddLFxuICAgIG1hc2s6IE5VTEwsXG4gICAgcGF0dGVybjogWydmaWxsJywgJ3N0cm9rZSddLFxuICAgIHJhZGlhbEdyYWRpZW50OiBbJ2ZpbGwnLCAnc3Ryb2tlJ11cbiAgfTtcbiAgdmFyIElOSkVDVEVEID0gMTtcbiAgdmFyIEZBSUwgPSAyO1xuXG4gIHZhciB1bmlxdWVJZENvdW50ZXIgPSAxO1xuICB2YXIgeG1sU2VyaWFsaXplcjtcbiAgdmFyIGRvbVBhcnNlcjtcblxuXG4gIC8vIGNyZWF0ZXMgYW4gU1ZHIGRvY3VtZW50IGZyb20gYW4gU1ZHIHN0cmluZ1xuICBmdW5jdGlvbiBzdmdTdHJpbmdUb1N2Z0RvYyhzdmdTdHIpIHtcbiAgICBkb21QYXJzZXIgPSBkb21QYXJzZXIgfHwgbmV3IERPTVBhcnNlcigpO1xuICAgIHJldHVybiBkb21QYXJzZXIucGFyc2VGcm9tU3RyaW5nKHN2Z1N0ciwgJ3RleHQveG1sJyk7XG4gIH1cblxuXG4gIC8vIHNlYXJpYWxpemVzIGFuIFNWRyBlbGVtZW50IHRvIGFuIFNWRyBzdHJpbmdcbiAgZnVuY3Rpb24gc3ZnRWxlbVRvU3ZnU3RyaW5nKHN2Z0VsZW1lbnQpIHtcbiAgICB4bWxTZXJpYWxpemVyID0geG1sU2VyaWFsaXplciB8fCBuZXcgWE1MU2VyaWFsaXplcigpO1xuICAgIHJldHVybiB4bWxTZXJpYWxpemVyLnNlcmlhbGl6ZVRvU3RyaW5nKHN2Z0VsZW1lbnQpO1xuICB9XG5cblxuICAvLyBSZXR1cm5zIHRoZSBhYnNvbHV0ZSB1cmwgZm9yIHRoZSBzcGVjaWZpZWQgdXJsXG4gIGZ1bmN0aW9uIGdldEFic29sdXRlVXJsKHVybCkge1xuICAgIEFfRUxFTUVOVC5ocmVmID0gdXJsO1xuICAgIHJldHVybiBBX0VMRU1FTlQuaHJlZjtcbiAgfVxuXG5cbiAgLy8gTG9hZCBzdmcgd2l0aCBhbiBYSFIgcmVxdWVzdFxuICBmdW5jdGlvbiBsb2FkU3ZnKHVybCwgY2FsbGJhY2ssIGVycm9yQ2FsbGJhY2spIHtcbiAgICBpZiAodXJsKSB7XG4gICAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgLy8gcmVhZHlTdGF0ZSBpcyBET05FXG4gICAgICAgICAgdmFyIHN0YXR1cyA9IHJlcS5zdGF0dXM7XG4gICAgICAgICAgaWYgKHN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgIC8vIHJlcXVlc3Qgc3RhdHVzIGlzIE9LXG4gICAgICAgICAgICBjYWxsYmFjayhyZXEucmVzcG9uc2VYTUwsIHJlcS5yZXNwb25zZVRleHQudHJpbSgpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgIC8vIHJlcXVlc3Qgc3RhdHVzIGlzIGVycm9yICg0eHggb3IgNXh4KVxuICAgICAgICAgICAgZXJyb3JDYWxsYmFjaygpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID09IDApIHtcbiAgICAgICAgICAgIC8vIHJlcXVlc3Qgc3RhdHVzIDAgY2FuIGluZGljYXRlIGEgZmFpbGVkIGNyb3NzLWRvbWFpbiBjYWxsXG4gICAgICAgICAgICBlcnJvckNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmVxLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgICByZXEuc2VuZCgpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gQ29weSBhdHRyaWJ1dGVzIGZyb20gaW1nIGVsZW1lbnQgdG8gc3ZnIGVsZW1lbnRcbiAgZnVuY3Rpb24gY29weUF0dHJpYnV0ZXMoaW1nRWxlbSwgc3ZnRWxlbSkge1xuICAgIHZhciBhdHRyaWJ1dGU7XG4gICAgdmFyIGF0dHJpYnV0ZU5hbWU7XG4gICAgdmFyIGF0dHJpYnV0ZVZhbHVlO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gaW1nRWxlbS5hdHRyaWJ1dGVzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXR0cmlidXRlc1tfTEVOR1RIX107IGkrKykge1xuICAgICAgYXR0cmlidXRlID0gYXR0cmlidXRlc1tpXTtcbiAgICAgIGF0dHJpYnV0ZU5hbWUgPSBhdHRyaWJ1dGUubmFtZTtcbiAgICAgIC8vIE9ubHkgY29weSBhdHRyaWJ1dGVzIG5vdCBleHBsaWNpdGx5IGV4Y2x1ZGVkIGZyb20gY29weWluZ1xuICAgICAgaWYgKEFUVFJJQlVURV9FWENMVVNJT05fTkFNRVMuaW5kZXhPZihhdHRyaWJ1dGVOYW1lKSA9PSAtMSkge1xuICAgICAgICBhdHRyaWJ1dGVWYWx1ZSA9IGF0dHJpYnV0ZS52YWx1ZTtcbiAgICAgICAgLy8gSWYgaW1nIGF0dHJpYnV0ZSBpcyBcInRpdGxlXCIsIGluc2VydCBhIHRpdGxlIGVsZW1lbnQgaW50byBTVkcgZWxlbWVudFxuICAgICAgICBpZiAoYXR0cmlidXRlTmFtZSA9PSBfVElUTEVfKSB7XG4gICAgICAgICAgdmFyIHRpdGxlRWxlbTtcbiAgICAgICAgICB2YXIgZmlyc3RFbGVtZW50Q2hpbGQgPSBzdmdFbGVtLmZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgIGlmIChmaXJzdEVsZW1lbnRDaGlsZCAmJiBmaXJzdEVsZW1lbnRDaGlsZC5sb2NhbE5hbWUudG9Mb3dlckNhc2UoKSA9PSBfVElUTEVfKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgU1ZHIGVsZW1lbnQncyBmaXJzdCBjaGlsZCBpcyBhIHRpdGxlIGVsZW1lbnQsIGtlZXAgaXQgYXMgdGhlIHRpdGxlIGVsZW1lbnRcbiAgICAgICAgICAgIHRpdGxlRWxlbSA9IGZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgU1ZHIGVsZW1lbnQncyBmaXJzdCBjaGlsZCBlbGVtZW50IGlzIG5vdCBhIHRpdGxlIGVsZW1lbnQsIGNyZWF0ZSBhIG5ldyB0aXRsZVxuICAgICAgICAgICAgLy8gZWxlLGVtdCBhbmQgc2V0IGl0IGFzIHRoZSBmaXJzdCBjaGlsZFxuICAgICAgICAgICAgdGl0bGVFbGVtID0gZG9jdW1lbnRbX0NSRUFURV9FTEVNRU5UXyArICdOUyddKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIF9USVRMRV8pO1xuICAgICAgICAgICAgc3ZnRWxlbS5pbnNlcnRCZWZvcmUodGl0bGVFbGVtLCBmaXJzdEVsZW1lbnRDaGlsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNldCBuZXcgdGl0bGUgY29udGVudFxuICAgICAgICAgIHRpdGxlRWxlbS50ZXh0Q29udGVudCA9IGF0dHJpYnV0ZVZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFNldCBpbWcgYXR0cmlidXRlIHRvIHN2ZyBlbGVtZW50XG4gICAgICAgICAgc3ZnRWxlbVtfU0VUX0FUVFJJQlVURV9dKGF0dHJpYnV0ZU5hbWUsIGF0dHJpYnV0ZVZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBhcHBlbmRzIGEgc3VmZml4IHRvIElEcyBvZiByZWZlcmVuY2VkIGVsZW1lbnRzIGluIHRoZSA8ZGVmcz4gaW4gb3JkZXIgdG8gIHRvIGF2b2lkIElEIGNvbGxpc2lvblxuICAvLyBiZXR3ZWVuIG11bHRpcGxlIGluamVjdGVkIFNWR3MuIFRoZSBzdWZmaXggaGFzIHRoZSBmb3JtIFwiLS1pbmplY3QtWFwiLCB3aGVyZSBYIGlzIGEgcnVubmluZyBudW1iZXIgd2hpY2ggaXNcbiAgLy8gaW5jcmVtZW50ZWQgd2l0aCBlYWNoIGluamVjdGlvbi4gUmVmZXJlbmNlcyB0byB0aGUgSURzIGFyZSBhZGp1c3RlZCBhY2NvcmRpbmdseS5cbiAgLy8gV2UgYXNzdW1lIHRoYSBhbGwgSURzIHdpdGhpbiB0aGUgaW5qZWN0ZWQgU1ZHIGFyZSB1bmlxdWUsIHRoZXJlZm9yZSB0aGUgc2FtZSBzdWZmaXggY2FuIGJlIHVzZWQgZm9yIGFsbCBJRHMgb2Ygb25lXG4gIC8vIGluamVjdGVkIFNWRy5cbiAgLy8gSWYgdGhlIG9ubHlSZWZlcmVuY2VkIGFyZ3VtZW50IGlzIHNldCB0byB0cnVlLCBvbmx5IHRob3NlIElEcyB3aWxsIGJlIG1hZGUgdW5pcXVlIHRoYXQgYXJlIHJlZmVyZW5jZWQgZnJvbSB3aXRoaW4gdGhlIFNWR1xuICBmdW5jdGlvbiBtYWtlSWRzVW5pcXVlKHN2Z0VsZW0sIG9ubHlSZWZlcmVuY2VkKSB7XG4gICAgdmFyIGlkU3VmZml4ID0gSURfU1VGRklYICsgdW5pcXVlSWRDb3VudGVyKys7XG4gICAgLy8gUmVndWxhciBleHByZXNzaW9uIGZvciBmdW5jdGlvbmFsIG5vdGF0aW9ucyBvZiBhbiBJUkkgcmVmZXJlbmNlcy4gVGhpcyB3aWxsIGZpbmQgb2NjdXJlbmNlcyBpbiB0aGUgZm9ybVxuICAgIC8vIHVybCgjYW55SWQpIG9yIHVybChcIiNhbnlJZFwiKSAoZm9yIEludGVybmV0IEV4cGxvcmVyKSBhbmQgY2FwdHVyZSB0aGUgcmVmZXJlbmNlZCBJRFxuICAgIHZhciBmdW5jSXJpUmVnZXggPSAvdXJsXFwoXCI/IyhbYS16QS1aXVtcXHc6Li1dKilcIj9cXCkvZztcbiAgICAvLyBHZXQgYWxsIGVsZW1lbnRzIHdpdGggYW4gSUQuIFRoZSBTVkcgc3BlYyByZWNvbW1lbmRzIHRvIHB1dCByZWZlcmVuY2VkIGVsZW1lbnRzIGluc2lkZSA8ZGVmcz4gZWxlbWVudHMsIGJ1dFxuICAgIC8vIHRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQsIHRoZXJlZm9yZSB3ZSBoYXZlIHRvIHNlYXJjaCBmb3IgSURzIGluIHRoZSB3aG9sZSBTVkcuXG4gICAgdmFyIGlkRWxlbWVudHMgPSBzdmdFbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tpZF0nKTtcbiAgICB2YXIgaWRFbGVtO1xuICAgIC8vIEFuIG9iamVjdCBjb250YWluaW5nIHJlZmVyZW5jZWQgSURzICBhcyBrZXlzIGlzIHVzZWQgaWYgb25seSByZWZlcmVuY2VkIElEcyBzaG91bGQgYmUgdW5pcXVpZmllZC5cbiAgICAvLyBJZiB0aGlzIG9iamVjdCBkb2VzIG5vdCBleGlzdCwgYWxsIElEcyB3aWxsIGJlIHVuaXF1aWZpZWQuXG4gICAgdmFyIHJlZmVyZW5jZWRJZHMgPSBvbmx5UmVmZXJlbmNlZCA/IFtdIDogTlVMTDtcbiAgICB2YXIgdGFnTmFtZTtcbiAgICB2YXIgaXJpVGFnTmFtZXMgPSB7fTtcbiAgICB2YXIgaXJpUHJvcGVydGllcyA9IFtdO1xuICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgdmFyIGksIGo7XG5cbiAgICBpZiAoaWRFbGVtZW50c1tfTEVOR1RIX10pIHtcbiAgICAgIC8vIE1ha2UgYWxsIElEcyB1bmlxdWUgYnkgYWRkaW5nIHRoZSBJRCBzdWZmaXggYW5kIGNvbGxlY3QgYWxsIGVuY291bnRlcmVkIHRhZyBuYW1lc1xuICAgICAgLy8gdGhhdCBhcmUgSVJJIHJlZmVyZW5jZWFibGUgZnJvbSBwcm9wZXJpdGllcy5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpZEVsZW1lbnRzW19MRU5HVEhfXTsgaSsrKSB7XG4gICAgICAgIHRhZ05hbWUgPSBpZEVsZW1lbnRzW2ldLmxvY2FsTmFtZTsgLy8gVXNlIG5vbi1uYW1lc3BhY2VkIHRhZyBuYW1lXG4gICAgICAgIC8vIE1ha2UgSUQgdW5pcXVlIGlmIHRhZyBuYW1lIGlzIElSSSByZWZlcmVuY2VhYmxlXG4gICAgICAgIGlmICh0YWdOYW1lIGluIElSSV9UQUdfUFJPUEVSVElFU19NQVApIHtcbiAgICAgICAgICBpcmlUYWdOYW1lc1t0YWdOYW1lXSA9IDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEdldCBhbGwgcHJvcGVydGllcyB0aGF0IGFyZSBtYXBwZWQgdG8gdGhlIGZvdW5kIElSSSByZWZlcmVuY2VhYmxlIHRhZ3NcbiAgICAgIGZvciAodGFnTmFtZSBpbiBpcmlUYWdOYW1lcykge1xuICAgICAgICAoSVJJX1RBR19QUk9QRVJUSUVTX01BUFt0YWdOYW1lXSB8fCBbdGFnTmFtZV0pLmZvckVhY2goZnVuY3Rpb24gKG1hcHBlZFByb3BlcnR5KSB7XG4gICAgICAgICAgLy8gQWRkIG1hcHBlZCBwcm9wZXJ0aWVzIHRvIGFycmF5IG9mIGlyaSByZWZlcmVuY2luZyBwcm9wZXJ0aWVzLlxuICAgICAgICAgIC8vIFVzZSBsaW5lYXIgc2VhcmNoIGhlcmUgYmVjYXVzZSB0aGUgbnVtYmVyIG9mIHBvc3NpYmxlIGVudHJpZXMgaXMgdmVyeSBzbWFsbCAobWF4aW11bSAxMSlcbiAgICAgICAgICBpZiAoaXJpUHJvcGVydGllcy5pbmRleE9mKG1hcHBlZFByb3BlcnR5KSA8IDApIHtcbiAgICAgICAgICAgIGlyaVByb3BlcnRpZXMucHVzaChtYXBwZWRQcm9wZXJ0eSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChpcmlQcm9wZXJ0aWVzW19MRU5HVEhfXSkge1xuICAgICAgICAvLyBBZGQgXCJzdHlsZVwiIHRvIHByb3BlcnRpZXMsIGJlY2F1c2UgaXQgbWF5IGNvbnRhaW4gcmVmZXJlbmNlcyBpbiB0aGUgZm9ybSAnc3R5bGU9XCJmaWxsOnVybCgjbXlGaWxsKVwiJ1xuICAgICAgICBpcmlQcm9wZXJ0aWVzLnB1c2goX1NUWUxFXyk7XG4gICAgICB9XG4gICAgICAvLyBSdW4gdGhyb3VnaCBhbGwgZWxlbWVudHMgb2YgdGhlIFNWRyBhbmQgcmVwbGFjZSBJRHMgaW4gcmVmZXJlbmNlcy5cbiAgICAgIC8vIFRvIGdldCBhbGwgZGVzY2VuZGluZyBlbGVtZW50cywgZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKSBzZWVtcyB0byBwZXJmb3JtIGZhc3RlciB0aGFuIHF1ZXJ5U2VsZWN0b3JBbGwoJyonKS5cbiAgICAgIC8vIFNpbmNlIHN2Z0VsZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKSBkb2VzIG5vdCByZXR1cm4gdGhlIHN2ZyBlbGVtZW50IGl0c2VsZiwgd2UgaGF2ZSB0byBoYW5kbGUgaXQgc2VwYXJhdGVseS5cbiAgICAgIHZhciBkZXNjRWxlbWVudHMgPSBzdmdFbGVtW19HRVRfRUxFTUVOVFNfQllfVEFHX05BTUVfXSgnKicpO1xuICAgICAgdmFyIGVsZW1lbnQgPSBzdmdFbGVtO1xuICAgICAgdmFyIHByb3BlcnR5TmFtZTtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIHZhciBuZXdWYWx1ZTtcbiAgICAgIGZvciAoaSA9IC0xOyBlbGVtZW50ICE9IE5VTEw7KSB7XG4gICAgICAgIGlmIChlbGVtZW50LmxvY2FsTmFtZSA9PSBfU1RZTEVfKSB7XG4gICAgICAgICAgLy8gSWYgZWxlbWVudCBpcyBhIHN0eWxlIGVsZW1lbnQsIHJlcGxhY2UgSURzIGluIGFsbCBvY2N1cmVuY2VzIG9mIFwidXJsKCNhbnlJZClcIiBpbiB0ZXh0IGNvbnRlbnRcbiAgICAgICAgICB2YWx1ZSA9IGVsZW1lbnQudGV4dENvbnRlbnQ7XG4gICAgICAgICAgbmV3VmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS5yZXBsYWNlKGZ1bmNJcmlSZWdleCwgZnVuY3Rpb24obWF0Y2gsIGlkKSB7XG4gICAgICAgICAgICBpZiAocmVmZXJlbmNlZElkcykge1xuICAgICAgICAgICAgICByZWZlcmVuY2VkSWRzW2lkXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJ3VybCgjJyArIGlkICsgaWRTdWZmaXggKyAnKSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgZWxlbWVudC50ZXh0Q29udGVudCA9IG5ld1ZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICAgIC8vIFJ1biB0aHJvdWdoIGFsbCBwcm9wZXJ0eSBuYW1lcyBmb3Igd2hpY2ggSURzIHdlcmUgZm91bmRcbiAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgaXJpUHJvcGVydGllc1tfTEVOR1RIX107IGorKykge1xuICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gaXJpUHJvcGVydGllc1tqXTtcbiAgICAgICAgICAgIHZhbHVlID0gZWxlbWVudFtfR0VUX0FUVFJJQlVURV9dKHByb3BlcnR5TmFtZSk7XG4gICAgICAgICAgICBuZXdWYWx1ZSA9IHZhbHVlICYmIHZhbHVlLnJlcGxhY2UoZnVuY0lyaVJlZ2V4LCBmdW5jdGlvbihtYXRjaCwgaWQpIHtcbiAgICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWRJZHMpIHtcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VkSWRzW2lkXSA9IDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJ3VybCgjJyArIGlkICsgaWRTdWZmaXggKyAnKSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgZWxlbWVudFtfU0VUX0FUVFJJQlVURV9dKHByb3BlcnR5TmFtZSwgbmV3VmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXBsYWNlIElEcyBpbiB4bGluazpyZWYgYW5kIGhyZWYgYXR0cmlidXRlc1xuICAgICAgICAgIFsneGxpbms6aHJlZicsICdocmVmJ10uZm9yRWFjaChmdW5jdGlvbihyZWZBdHRyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGlyaSA9IGVsZW1lbnRbX0dFVF9BVFRSSUJVVEVfXShyZWZBdHRyTmFtZSk7XG4gICAgICAgICAgICBpZiAoL15cXHMqIy8udGVzdChpcmkpKSB7IC8vIENoZWNrIGlmIGlyaSBpcyBub24tbnVsbCBhbmQgaW50ZXJuYWwgcmVmZXJlbmNlXG4gICAgICAgICAgICAgIGlyaSA9IGlyaS50cmltKCk7XG4gICAgICAgICAgICAgIGVsZW1lbnRbX1NFVF9BVFRSSUJVVEVfXShyZWZBdHRyTmFtZSwgaXJpICsgaWRTdWZmaXgpO1xuICAgICAgICAgICAgICBpZiAocmVmZXJlbmNlZElkcykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBJRCB0byByZWZlcmVuY2VkIElEc1xuICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRJZHNbaXJpLnN1YnN0cmluZygxKV0gPSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudCA9IGRlc2NFbGVtZW50c1srK2ldO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IGlkRWxlbWVudHNbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgICAgaWRFbGVtID0gaWRFbGVtZW50c1tpXTtcbiAgICAgICAgLy8gSWYgc2V0IG9mIHJlZmVyZW5jZWQgSURzIGV4aXN0cywgbWFrZSBvbmx5IHJlZmVyZW5jZWQgSURzIHVuaXF1ZSxcbiAgICAgICAgLy8gb3RoZXJ3aXNlIG1ha2UgYWxsIElEcyB1bmlxdWUuXG4gICAgICAgIGlmICghcmVmZXJlbmNlZElkcyB8fCByZWZlcmVuY2VkSWRzW2lkRWxlbS5pZF0pIHtcbiAgICAgICAgICAvLyBBZGQgc3VmZml4IHRvIGVsZW1lbnQncyBJRFxuICAgICAgICAgIGlkRWxlbS5pZCArPSBpZFN1ZmZpeDtcbiAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyByZXR1cm4gdHJ1ZSBpZiBTVkcgZWxlbWVudCBoYXMgY2hhbmdlZFxuICAgIHJldHVybiBjaGFuZ2VkO1xuICB9XG5cblxuICAvLyBGb3IgY2FjaGVkIFNWR3MgdGhlIElEcyBhcmUgbWFkZSB1bmlxdWUgYnkgc2ltcGx5IHJlcGxhY2luZyB0aGUgYWxyZWFkeSBpbnNlcnRlZCB1bmlxdWUgSURzIHdpdGggYVxuICAvLyBoaWdoZXIgSUQgY291bnRlci4gVGhpcyBpcyBtdWNoIG1vcmUgcGVyZm9ybWFudCB0aGFuIGEgY2FsbCB0byBtYWtlSWRzVW5pcXVlKCkuXG4gIGZ1bmN0aW9uIG1ha2VJZHNVbmlxdWVDYWNoZWQoc3ZnU3RyaW5nKSB7XG4gICAgcmV0dXJuIHN2Z1N0cmluZy5yZXBsYWNlKElEX1NVRkZJWF9SRUdFWCwgSURfU1VGRklYICsgdW5pcXVlSWRDb3VudGVyKyspO1xuICB9XG5cblxuICAvLyBJbmplY3QgU1ZHIGJ5IHJlcGxhY2luZyB0aGUgaW1nIGVsZW1lbnQgd2l0aCB0aGUgU1ZHIGVsZW1lbnQgaW4gdGhlIERPTVxuICBmdW5jdGlvbiBpbmplY3QoaW1nRWxlbSwgc3ZnRWxlbSwgYWJzVXJsLCBvcHRpb25zKSB7XG4gICAgaWYgKHN2Z0VsZW0pIHtcbiAgICAgIHN2Z0VsZW1bX1NFVF9BVFRSSUJVVEVfXSgnZGF0YS1pbmplY3QtdXJsJywgYWJzVXJsKTtcbiAgICAgIHZhciBwYXJlbnROb2RlID0gaW1nRWxlbS5wYXJlbnROb2RlO1xuICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuY29weUF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICBjb3B5QXR0cmlidXRlcyhpbWdFbGVtLCBzdmdFbGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbnZva2UgYmVmb3JlSW5qZWN0IGhvb2sgaWYgc2V0XG4gICAgICAgIHZhciBiZWZvcmVJbmplY3QgPSBvcHRpb25zLmJlZm9yZUluamVjdDtcbiAgICAgICAgdmFyIGluamVjdEVsZW0gPSAoYmVmb3JlSW5qZWN0ICYmIGJlZm9yZUluamVjdChpbWdFbGVtLCBzdmdFbGVtKSkgfHwgc3ZnRWxlbTtcbiAgICAgICAgLy8gUmVwbGFjZSBpbWcgZWxlbWVudCB3aXRoIG5ldyBlbGVtZW50LiBUaGlzIGlzIHRoZSBhY3R1YWwgaW5qZWN0aW9uLlxuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChpbmplY3RFbGVtLCBpbWdFbGVtKTtcbiAgICAgICAgLy8gTWFyayBpbWcgZWxlbWVudCBhcyBpbmplY3RlZFxuICAgICAgICBpbWdFbGVtW19fU1ZHSU5KRUNUXSA9IElOSkVDVEVEO1xuICAgICAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSk7XG4gICAgICAgIC8vIEludm9rZSBhZnRlckluamVjdCBob29rIGlmIHNldFxuICAgICAgICB2YXIgYWZ0ZXJJbmplY3QgPSBvcHRpb25zLmFmdGVySW5qZWN0O1xuICAgICAgICBpZiAoYWZ0ZXJJbmplY3QpIHtcbiAgICAgICAgICBhZnRlckluamVjdChpbWdFbGVtLCBpbmplY3RFbGVtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdmdJbnZhbGlkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gTWVyZ2VzIGFueSBudW1iZXIgb2Ygb3B0aW9ucyBvYmplY3RzIGludG8gYSBuZXcgb2JqZWN0XG4gIGZ1bmN0aW9uIG1lcmdlT3B0aW9ucygpIHtcbiAgICB2YXIgbWVyZ2VkT3B0aW9ucyA9IHt9O1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBhbGwgc3BlY2lmaWVkIG9wdGlvbnMgb2JqZWN0cyBhbmQgYWRkIGFsbCBwcm9wZXJ0aWVzIHRvIHRoZSBuZXcgb3B0aW9ucyBvYmplY3RcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3NbX0xFTkdUSF9dOyBpKyspIHtcbiAgICAgIHZhciBhcmd1bWVudCA9IGFyZ3NbaV07XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudCkge1xuICAgICAgICAgIGlmIChhcmd1bWVudC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBtZXJnZWRPcHRpb25zW2tleV0gPSBhcmd1bWVudFtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIHJldHVybiBtZXJnZWRPcHRpb25zO1xuICB9XG5cblxuICAvLyBBZGRzIHRoZSBzcGVjaWZpZWQgQ1NTIHRvIHRoZSBkb2N1bWVudCdzIDxoZWFkPiBlbGVtZW50XG4gIGZ1bmN0aW9uIGFkZFN0eWxlVG9IZWFkKGNzcykge1xuICAgIHZhciBoZWFkID0gZG9jdW1lbnRbX0dFVF9FTEVNRU5UU19CWV9UQUdfTkFNRV9dKCdoZWFkJylbMF07XG4gICAgaWYgKGhlYWQpIHtcbiAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50W19DUkVBVEVfRUxFTUVOVF9dKF9TVFlMRV8pO1xuICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gQnVpbGRzIGFuIFNWRyBlbGVtZW50IGZyb20gdGhlIHNwZWNpZmllZCBTVkcgc3RyaW5nXG4gIGZ1bmN0aW9uIGJ1aWxkU3ZnRWxlbWVudChzdmdTdHIsIHZlcmlmeSkge1xuICAgIGlmICh2ZXJpZnkpIHtcbiAgICAgIHZhciBzdmdEb2M7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBQYXJzZSB0aGUgU1ZHIHN0cmluZyB3aXRoIERPTVBhcnNlclxuICAgICAgICBzdmdEb2MgPSBzdmdTdHJpbmdUb1N2Z0RvYyhzdmdTdHIpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBOVUxMO1xuICAgICAgfVxuICAgICAgaWYgKHN2Z0RvY1tfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FX10oJ3BhcnNlcmVycm9yJylbX0xFTkdUSF9dKSB7XG4gICAgICAgIC8vIERPTVBhcnNlciBkb2VzIG5vdCB0aHJvdyBhbiBleGNlcHRpb24sIGJ1dCBpbnN0ZWFkIHB1dHMgcGFyc2VyZXJyb3IgdGFncyBpbiB0aGUgZG9jdW1lbnRcbiAgICAgICAgcmV0dXJuIE5VTEw7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3ZnRG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmlubmVySFRNTCA9IHN2Z1N0cjtcbiAgICAgIHJldHVybiBkaXYuZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgfVxuICB9XG5cblxuICBmdW5jdGlvbiByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nRWxlbSkge1xuICAgIC8vIFJlbW92ZSB0aGUgb25sb2FkIGF0dHJpYnV0ZS4gU2hvdWxkIG9ubHkgYmUgdXNlZCB0byByZW1vdmUgdGhlIHVuc3R5bGVkIGltYWdlIGZsYXNoIHByb3RlY3Rpb24gYW5kXG4gICAgLy8gbWFrZSB0aGUgZWxlbWVudCB2aXNpYmxlLCBub3QgZm9yIHJlbW92aW5nIHRoZSBldmVudCBsaXN0ZW5lci5cbiAgICBpbWdFbGVtLnJlbW92ZUF0dHJpYnV0ZSgnb25sb2FkJyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGVycm9yTWVzc2FnZShtc2cpIHtcbiAgICBjb25zb2xlLmVycm9yKCdTVkdJbmplY3Q6ICcgKyBtc2cpO1xuICB9XG5cblxuICBmdW5jdGlvbiBmYWlsKGltZ0VsZW0sIHN0YXR1cywgb3B0aW9ucykge1xuICAgIGltZ0VsZW1bX19TVkdJTkpFQ1RdID0gRkFJTDtcbiAgICBpZiAob3B0aW9ucy5vbkZhaWwpIHtcbiAgICAgIG9wdGlvbnMub25GYWlsKGltZ0VsZW0sIHN0YXR1cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVycm9yTWVzc2FnZShzdGF0dXMpO1xuICAgIH1cbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKSB7XG4gICAgcmVtb3ZlT25Mb2FkQXR0cmlidXRlKGltZ0VsZW0pO1xuICAgIGZhaWwoaW1nRWxlbSwgU1ZHX0lOVkFMSUQsIG9wdGlvbnMpO1xuICB9XG5cblxuICBmdW5jdGlvbiBzdmdOb3RTdXBwb3J0ZWQoaW1nRWxlbSwgb3B0aW9ucykge1xuICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWdFbGVtKTtcbiAgICBmYWlsKGltZ0VsZW0sIFNWR19OT1RfU1VQUE9SVEVELCBvcHRpb25zKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gbG9hZEZhaWwoaW1nRWxlbSwgb3B0aW9ucykge1xuICAgIGZhaWwoaW1nRWxlbSwgTE9BRF9GQUlMLCBvcHRpb25zKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoaW1nRWxlbSkge1xuICAgIGltZ0VsZW0ub25sb2FkID0gTlVMTDtcbiAgICBpbWdFbGVtLm9uZXJyb3IgPSBOVUxMO1xuICB9XG5cblxuICBmdW5jdGlvbiBpbWdOb3RTZXQobXNnKSB7XG4gICAgZXJyb3JNZXNzYWdlKCdubyBpbWcgZWxlbWVudCcpO1xuICB9XG5cblxuICBmdW5jdGlvbiBjcmVhdGVTVkdJbmplY3QoZ2xvYmFsTmFtZSwgb3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0T3B0aW9ucyA9IG1lcmdlT3B0aW9ucyhERUZBVUxUX09QVElPTlMsIG9wdGlvbnMpO1xuICAgIHZhciBzdmdMb2FkQ2FjaGUgPSB7fTtcblxuICAgIGlmIChJU19TVkdfU1VQUE9SVEVEKSB7XG4gICAgICAvLyBJZiB0aGUgYnJvd3NlciBzdXBwb3J0cyBTVkcsIGFkZCBhIHNtYWxsIHN0eWxlc2hlZXQgdGhhdCBoaWRlcyB0aGUgPGltZz4gZWxlbWVudHMgdW50aWxcbiAgICAgIC8vIGluamVjdGlvbiBpcyBmaW5pc2hlZC4gVGhpcyBhdm9pZHMgc2hvd2luZyB0aGUgdW5zdHlsZWQgU1ZHcyBiZWZvcmUgc3R5bGUgaXMgYXBwbGllZC5cbiAgICAgIGFkZFN0eWxlVG9IZWFkKCdpbWdbb25sb2FkXj1cIicgKyBnbG9iYWxOYW1lICsgJyhcIl17dmlzaWJpbGl0eTpoaWRkZW47fScpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogU1ZHSW5qZWN0XG4gICAgICpcbiAgICAgKiBJbmplY3RzIHRoZSBTVkcgc3BlY2lmaWVkIGluIHRoZSBgc3JjYCBhdHRyaWJ1dGUgb2YgdGhlIHNwZWNpZmllZCBgaW1nYCBlbGVtZW50IG9yIGFycmF5IG9mIGBpbWdgXG4gICAgICogZWxlbWVudHMuIFJldHVybnMgYSBQcm9taXNlIG9iamVjdCB3aGljaCByZXNvbHZlcyBpZiBhbGwgcGFzc2VkIGluIGBpbWdgIGVsZW1lbnRzIGhhdmUgZWl0aGVyIGJlZW5cbiAgICAgKiBpbmplY3RlZCBvciBmYWlsZWQgdG8gaW5qZWN0IChPbmx5IGlmIGEgZ2xvYmFsIFByb21pc2Ugb2JqZWN0IGlzIGF2YWlsYWJsZSBsaWtlIGluIGFsbCBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgKiBvciB0aHJvdWdoIGEgcG9seWZpbGwpLlxuICAgICAqXG4gICAgICogT3B0aW9uczpcbiAgICAgKiB1c2VDYWNoZTogSWYgc2V0IHRvIGB0cnVlYCB0aGUgU1ZHIHdpbGwgYmUgY2FjaGVkIHVzaW5nIHRoZSBhYnNvbHV0ZSBVUkwuIERlZmF1bHQgdmFsdWUgaXMgYHRydWVgLlxuICAgICAqIGNvcHlBdHRyaWJ1dGVzOiBJZiBzZXQgdG8gYHRydWVgIHRoZSBhdHRyaWJ1dGVzIHdpbGwgYmUgY29waWVkIGZyb20gYGltZ2AgdG8gYHN2Z2AuIERmYXVsdCB2YWx1ZVxuICAgICAqICAgICBpcyBgdHJ1ZWAuXG4gICAgICogbWFrZUlkc1VuaXF1ZTogSWYgc2V0IHRvIGB0cnVlYCB0aGUgSUQgb2YgZWxlbWVudHMgaW4gdGhlIGA8ZGVmcz5gIGVsZW1lbnQgdGhhdCBjYW4gYmUgcmVmZXJlbmNlcyBieVxuICAgICAqICAgICBwcm9wZXJ0eSB2YWx1ZXMgKGZvciBleGFtcGxlICdjbGlwUGF0aCcpIGFyZSBtYWRlIHVuaXF1ZSBieSBhcHBlbmRpbmcgXCItLWluamVjdC1YXCIsIHdoZXJlIFggaXMgYVxuICAgICAqICAgICBydW5uaW5nIG51bWJlciB3aGljaCBpbmNyZWFzZXMgd2l0aCBlYWNoIGluamVjdGlvbi4gVGhpcyBpcyBkb25lIHRvIGF2b2lkIGR1cGxpY2F0ZSBJRHMgaW4gdGhlIERPTS5cbiAgICAgKiBiZWZvcmVMb2FkOiBIb29rIGJlZm9yZSBTVkcgaXMgbG9hZGVkLiBUaGUgYGltZ2AgZWxlbWVudCBpcyBwYXNzZWQgYXMgYSBwYXJhbWV0ZXIuIElmIHRoZSBob29rIHJldHVybnNcbiAgICAgKiAgICAgYSBzdHJpbmcgaXQgaXMgdXNlZCBhcyB0aGUgVVJMIGluc3RlYWQgb2YgdGhlIGBpbWdgIGVsZW1lbnQncyBgc3JjYCBhdHRyaWJ1dGUuXG4gICAgICogYWZ0ZXJMb2FkOiBIb29rIGFmdGVyIFNWRyBpcyBsb2FkZWQuIFRoZSBsb2FkZWQgYHN2Z2AgZWxlbWVudCBhbmQgYHN2Z2Agc3RyaW5nIGFyZSBwYXNzZWQgYXMgYVxuICAgICAqICAgICBwYXJhbWV0ZXJzLiBJZiBjYWNoaW5nIGlzIGFjdGl2ZSB0aGlzIGhvb2sgd2lsbCBvbmx5IGdldCBjYWxsZWQgb25jZSBmb3IgaW5qZWN0ZWQgU1ZHcyB3aXRoIHRoZVxuICAgICAqICAgICBzYW1lIGFic29sdXRlIHBhdGguIENoYW5nZXMgdG8gdGhlIGBzdmdgIGVsZW1lbnQgaW4gdGhpcyBob29rIHdpbGwgYmUgYXBwbGllZCB0byBhbGwgaW5qZWN0ZWQgU1ZHc1xuICAgICAqICAgICB3aXRoIHRoZSBzYW1lIGFic29sdXRlIHBhdGguIEl0J3MgYWxzbyBwb3NzaWJsZSB0byByZXR1cm4gYW4gYHN2Z2Agc3RyaW5nIG9yIGBzdmdgIGVsZW1lbnQgd2hpY2hcbiAgICAgKiAgICAgd2lsbCB0aGVuIGJlIHVzZWQgZm9yIHRoZSBpbmplY3Rpb24uXG4gICAgICogYmVmb3JlSW5qZWN0OiBIb29rIGJlZm9yZSBTVkcgaXMgaW5qZWN0ZWQuIFRoZSBgaW1nYCBhbmQgYHN2Z2AgZWxlbWVudHMgYXJlIHBhc3NlZCBhcyBwYXJhbWV0ZXJzLiBJZlxuICAgICAqICAgICBhbnkgaHRtbCBlbGVtZW50IGlzIHJldHVybmVkIGl0IGdldHMgaW5qZWN0ZWQgaW5zdGVhZCBvZiBhcHBseWluZyB0aGUgZGVmYXVsdCBTVkcgaW5qZWN0aW9uLlxuICAgICAqIGFmdGVySW5qZWN0OiBIb29rIGFmdGVyIFNWRyBpcyBpbmplY3RlZC4gVGhlIGBpbWdgIGFuZCBgc3ZnYCBlbGVtZW50cyBhcmUgcGFzc2VkIGFzIHBhcmFtZXRlcnMuXG4gICAgICogb25BbGxGaW5pc2g6IEhvb2sgYWZ0ZXIgYWxsIGBpbWdgIGVsZW1lbnRzIHBhc3NlZCB0byBhbiBTVkdJbmplY3QoKSBjYWxsIGhhdmUgZWl0aGVyIGJlZW4gaW5qZWN0ZWQgb3JcbiAgICAgKiAgICAgZmFpbGVkIHRvIGluamVjdC5cbiAgICAgKiBvbkZhaWw6IEhvb2sgYWZ0ZXIgaW5qZWN0aW9uIGZhaWxzLiBUaGUgYGltZ2AgZWxlbWVudCBhbmQgYSBgc3RhdHVzYCBzdHJpbmcgYXJlIHBhc3NlZCBhcyBhbiBwYXJhbWV0ZXIuXG4gICAgICogICAgIFRoZSBgc3RhdHVzYCBjYW4gYmUgZWl0aGVyIGAnU1ZHX05PVF9TVVBQT1JURUQnYCAodGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBTVkcpLFxuICAgICAqICAgICBgJ1NWR19JTlZBTElEJ2AgKHRoZSBTVkcgaXMgbm90IGluIGEgdmFsaWQgZm9ybWF0KSBvciBgJ0xPQURfRkFJTEVEJ2AgKGxvYWRpbmcgb2YgdGhlIFNWRyBmYWlsZWQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MSW1hZ2VFbGVtZW50fSBpbWcgLSBhbiBpbWcgZWxlbWVudCBvciBhbiBhcnJheSBvZiBpbWcgZWxlbWVudHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gb3B0aW9uYWwgcGFyYW1ldGVyIHdpdGggW29wdGlvbnNdKCNvcHRpb25zKSBmb3IgdGhpcyBpbmplY3Rpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gU1ZHSW5qZWN0KGltZywgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG1lcmdlT3B0aW9ucyhkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICAgIHZhciBydW4gPSBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIHZhciBhbGxGaW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgb25BbGxGaW5pc2ggPSBvcHRpb25zLm9uQWxsRmluaXNoO1xuICAgICAgICAgIGlmIChvbkFsbEZpbmlzaCkge1xuICAgICAgICAgICAgb25BbGxGaW5pc2goKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSAmJiByZXNvbHZlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGltZyAmJiB0eXBlb2YgaW1nW19MRU5HVEhfXSAhPSBfVU5ERUZJTkVEXykge1xuICAgICAgICAgIC8vIGFuIGFycmF5IGxpa2Ugc3RydWN0dXJlIG9mIGltZyBlbGVtZW50c1xuICAgICAgICAgIHZhciBpbmplY3RJbmRleCA9IDA7XG4gICAgICAgICAgdmFyIGluamVjdENvdW50ID0gaW1nW19MRU5HVEhfXTtcblxuICAgICAgICAgIGlmIChpbmplY3RDb3VudCA9PSAwKSB7XG4gICAgICAgICAgICBhbGxGaW5pc2goKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoKytpbmplY3RJbmRleCA9PSBpbmplY3RDb3VudCkge1xuICAgICAgICAgICAgICAgIGFsbEZpbmlzaCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluamVjdENvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgU1ZHSW5qZWN0RWxlbWVudChpbWdbaV0sIG9wdGlvbnMsIGZpbmlzaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG9ubHkgb25lIGltZyBlbGVtZW50XG4gICAgICAgICAgU1ZHSW5qZWN0RWxlbWVudChpbWcsIG9wdGlvbnMsIGFsbEZpbmlzaCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIHJldHVybiBhIFByb21pc2Ugb2JqZWN0IGlmIGdsb2JhbGx5IGF2YWlsYWJsZVxuICAgICAgcmV0dXJuIHR5cGVvZiBQcm9taXNlID09IF9VTkRFRklORURfID8gcnVuKCkgOiBuZXcgUHJvbWlzZShydW4pO1xuICAgIH1cblxuXG4gICAgLy8gSW5qZWN0cyBhIHNpbmdsZSBzdmcgZWxlbWVudC4gT3B0aW9ucyBtdXN0IGJlIGFscmVhZHkgbWVyZ2VkIHdpdGggdGhlIGRlZmF1bHQgb3B0aW9ucy5cbiAgICBmdW5jdGlvbiBTVkdJbmplY3RFbGVtZW50KGltZ0VsZW0sIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICBpZiAoaW1nRWxlbSkge1xuICAgICAgICB2YXIgc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUgPSBpbWdFbGVtW19fU1ZHSU5KRUNUXTtcbiAgICAgICAgaWYgKCFzdmdJbmplY3RBdHRyaWJ1dGVWYWx1ZSkge1xuICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXJzKGltZ0VsZW0pO1xuXG4gICAgICAgICAgaWYgKCFJU19TVkdfU1VQUE9SVEVEKSB7XG4gICAgICAgICAgICBzdmdOb3RTdXBwb3J0ZWQoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBJbnZva2UgYmVmb3JlTG9hZCBob29rIGlmIHNldC4gSWYgdGhlIGJlZm9yZUxvYWQgcmV0dXJucyBhIHZhbHVlIHVzZSBpdCBhcyB0aGUgc3JjIGZvciB0aGUgbG9hZFxuICAgICAgICAgIC8vIFVSTCBwYXRoLiBFbHNlIHVzZSB0aGUgaW1nRWxlbSdzIHNyYyBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgICAgICAgdmFyIGJlZm9yZUxvYWQgPSBvcHRpb25zLmJlZm9yZUxvYWQ7XG4gICAgICAgICAgdmFyIHNyYyA9IChiZWZvcmVMb2FkICYmIGJlZm9yZUxvYWQoaW1nRWxlbSkpIHx8IGltZ0VsZW1bX0dFVF9BVFRSSUJVVEVfXSgnc3JjJyk7XG5cbiAgICAgICAgICBpZiAoIXNyYykge1xuICAgICAgICAgICAgLy8gSWYgbm8gaW1hZ2Ugc3JjIGF0dHJpYnV0ZSBpcyBzZXQgZG8gbm8gaW5qZWN0aW9uLiBUaGlzIGNhbiBvbmx5IGJlIHJlYWNoZWQgYnkgdXNpbmcgamF2YXNjcmlwdFxuICAgICAgICAgICAgLy8gYmVjYXVzZSBpZiBubyBzcmMgYXR0cmlidXRlIGlzIHNldCB0aGUgb25sb2FkIGFuZCBvbmVycm9yIGV2ZW50cyBkbyBub3QgZ2V0IGNhbGxlZFxuICAgICAgICAgICAgaWYgKHNyYyA9PT0gJycpIHtcbiAgICAgICAgICAgICAgbG9hZEZhaWwoaW1nRWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHNldCBhcnJheSBzbyBsYXRlciBjYWxscyBjYW4gcmVnaXN0ZXIgY2FsbGJhY2tzXG4gICAgICAgICAgdmFyIG9uRmluaXNoQ2FsbGJhY2tzID0gW107XG4gICAgICAgICAgaW1nRWxlbVtfX1NWR0lOSkVDVF0gPSBvbkZpbmlzaENhbGxiYWNrcztcblxuICAgICAgICAgIHZhciBvbkZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIG9uRmluaXNoQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24ob25GaW5pc2hDYWxsYmFjaykge1xuICAgICAgICAgICAgICBvbkZpbmlzaENhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdmFyIGFic1VybCA9IGdldEFic29sdXRlVXJsKHNyYyk7XG4gICAgICAgICAgdmFyIHVzZUNhY2hlT3B0aW9uID0gb3B0aW9ucy51c2VDYWNoZTtcbiAgICAgICAgICB2YXIgbWFrZUlkc1VuaXF1ZU9wdGlvbiA9IG9wdGlvbnMubWFrZUlkc1VuaXF1ZTtcbiAgICAgICAgICBcbiAgICAgICAgICB2YXIgc2V0U3ZnTG9hZENhY2hlVmFsdWUgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgIGlmICh1c2VDYWNoZU9wdGlvbikge1xuICAgICAgICAgICAgICBzdmdMb2FkQ2FjaGVbYWJzVXJsXS5mb3JFYWNoKGZ1bmN0aW9uKHN2Z0xvYWQpIHtcbiAgICAgICAgICAgICAgICBzdmdMb2FkKHZhbCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBzdmdMb2FkQ2FjaGVbYWJzVXJsXSA9IHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKHVzZUNhY2hlT3B0aW9uKSB7XG4gICAgICAgICAgICB2YXIgc3ZnTG9hZCA9IHN2Z0xvYWRDYWNoZVthYnNVcmxdO1xuXG4gICAgICAgICAgICB2YXIgaGFuZGxlTG9hZFZhbHVlID0gZnVuY3Rpb24obG9hZFZhbHVlKSB7XG4gICAgICAgICAgICAgIGlmIChsb2FkVmFsdWUgPT09IExPQURfRkFJTCkge1xuICAgICAgICAgICAgICAgIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvYWRWYWx1ZSA9PT0gU1ZHX0lOVkFMSUQpIHtcbiAgICAgICAgICAgICAgICBzdmdJbnZhbGlkKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBoYXNVbmlxdWVJZHMgPSBsb2FkVmFsdWVbMF07XG4gICAgICAgICAgICAgICAgdmFyIHN2Z1N0cmluZyA9IGxvYWRWYWx1ZVsxXTtcbiAgICAgICAgICAgICAgICB2YXIgdW5pcXVlSWRzU3ZnU3RyaW5nID0gbG9hZFZhbHVlWzJdO1xuICAgICAgICAgICAgICAgIHZhciBzdmdFbGVtO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1ha2VJZHNVbmlxdWVPcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgIGlmIChoYXNVbmlxdWVJZHMgPT09IE5VTEwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSURzIGZvciB0aGUgU1ZHIHN0cmluZyBoYXZlIG5vdCBiZWVuIG1hZGUgdW5pcXVlIGJlZm9yZS4gVGhpcyBtYXkgaGFwcGVuIGlmIHByZXZpb3VzXG4gICAgICAgICAgICAgICAgICAgIC8vIGluamVjdGlvbiBvZiBhIGNhY2hlZCBTVkcgaGF2ZSBiZWVuIHJ1biB3aXRoIHRoZSBvcHRpb24gbWFrZWRJZHNVbmlxdWUgc2V0IHRvIGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIHN2Z0VsZW0gPSBidWlsZFN2Z0VsZW1lbnQoc3ZnU3RyaW5nLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGhhc1VuaXF1ZUlkcyA9IG1ha2VJZHNVbmlxdWUoc3ZnRWxlbSwgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxvYWRWYWx1ZVswXSA9IGhhc1VuaXF1ZUlkcztcbiAgICAgICAgICAgICAgICAgICAgbG9hZFZhbHVlWzJdID0gaGFzVW5pcXVlSWRzICYmIHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzVW5pcXVlSWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1ha2UgSURzIHVuaXF1ZSBmb3IgYWxyZWFkeSBjYWNoZWQgU1ZHcyB3aXRoIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgICAgICAgICBzdmdTdHJpbmcgPSBtYWtlSWRzVW5pcXVlQ2FjaGVkKHVuaXF1ZUlkc1N2Z1N0cmluZyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3ZnRWxlbSA9IHN2Z0VsZW0gfHwgYnVpbGRTdmdFbGVtZW50KHN2Z1N0cmluZywgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgaW5qZWN0KGltZ0VsZW0sIHN2Z0VsZW0sIGFic1VybCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb25GaW5pc2goKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3ZnTG9hZCAhPSBfVU5ERUZJTkVEXykge1xuICAgICAgICAgICAgICAvLyBWYWx1ZSBmb3IgdXJsIGV4aXN0cyBpbiBjYWNoZVxuICAgICAgICAgICAgICBpZiAoc3ZnTG9hZC5pc0NhbGxiYWNrUXVldWUpIHtcbiAgICAgICAgICAgICAgICAvLyBTYW1lIHVybCBoYXMgYmVlbiBjYWNoZWQsIGJ1dCB2YWx1ZSBoYXMgbm90IGJlZW4gbG9hZGVkIHlldCwgc28gYWRkIHRvIGNhbGxiYWNrc1xuICAgICAgICAgICAgICAgIHN2Z0xvYWQucHVzaChoYW5kbGVMb2FkVmFsdWUpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGhhbmRsZUxvYWRWYWx1ZShzdmdMb2FkKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgc3ZnTG9hZCA9IFtdO1xuICAgICAgICAgICAgICAvLyBzZXQgcHJvcGVydHkgaXNDYWxsYmFja1F1ZXVlIHRvIEFycmF5IHRvIGRpZmZlcmVudGlhdGUgZnJvbSBhcnJheSB3aXRoIGNhY2hlZCBsb2FkZWQgdmFsdWVzXG4gICAgICAgICAgICAgIHN2Z0xvYWQuaXNDYWxsYmFja1F1ZXVlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgc3ZnTG9hZENhY2hlW2Fic1VybF0gPSBzdmdMb2FkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIExvYWQgdGhlIFNWRyBiZWNhdXNlIGl0IGlzIG5vdCBjYWNoZWQgb3IgY2FjaGluZyBpcyBkaXNhYmxlZFxuICAgICAgICAgIGxvYWRTdmcoYWJzVXJsLCBmdW5jdGlvbihzdmdYbWwsIHN2Z1N0cmluZykge1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBYTUwgZnJvbSB0aGUgWEhSIHJlcXVlc3QgaWYgaXQgaXMgYW4gaW5zdGFuY2Ugb2YgRG9jdW1lbnQuIE90aGVyd2lzZVxuICAgICAgICAgICAgLy8gKGZvciBleGFtcGxlIG9mIElFOSksIGNyZWF0ZSB0aGUgc3ZnIGRvY3VtZW50IGZyb20gdGhlIHN2ZyBzdHJpbmcuXG4gICAgICAgICAgICB2YXIgc3ZnRWxlbSA9IHN2Z1htbCBpbnN0YW5jZW9mIERvY3VtZW50ID8gc3ZnWG1sLmRvY3VtZW50RWxlbWVudCA6IGJ1aWxkU3ZnRWxlbWVudChzdmdTdHJpbmcsIHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgYWZ0ZXJMb2FkID0gb3B0aW9ucy5hZnRlckxvYWQ7XG4gICAgICAgICAgICBpZiAoYWZ0ZXJMb2FkKSB7XG4gICAgICAgICAgICAgIC8vIEludm9rZSBhZnRlckxvYWQgaG9vayB3aGljaCBtYXkgbW9kaWZ5IHRoZSBTVkcgZWxlbWVudC4gQWZ0ZXIgbG9hZCBtYXkgYWxzbyByZXR1cm4gYSBuZXdcbiAgICAgICAgICAgICAgLy8gc3ZnIGVsZW1lbnQgb3Igc3ZnIHN0cmluZ1xuICAgICAgICAgICAgICB2YXIgc3ZnRWxlbU9yU3ZnU3RyaW5nID0gYWZ0ZXJMb2FkKHN2Z0VsZW0sIHN2Z1N0cmluZykgfHwgc3ZnRWxlbTtcbiAgICAgICAgICAgICAgaWYgKHN2Z0VsZW1PclN2Z1N0cmluZykge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBzdmdFbGVtIGFuZCBzdmdTdHJpbmcgYmVjYXVzZSBvZiBtb2RpZmljYXRpb25zIHRvIHRoZSBTVkcgZWxlbWVudCBvciBTVkcgc3RyaW5nIGluXG4gICAgICAgICAgICAgICAgLy8gdGhlIGFmdGVyTG9hZCBob29rLCBzbyB0aGUgbW9kaWZpZWQgU1ZHIGlzIGFsc28gdXNlZCBmb3IgYWxsIGxhdGVyIGNhY2hlZCBpbmplY3Rpb25zXG4gICAgICAgICAgICAgICAgdmFyIGlzU3RyaW5nID0gdHlwZW9mIHN2Z0VsZW1PclN2Z1N0cmluZyA9PSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICBzdmdTdHJpbmcgPSBpc1N0cmluZyA/IHN2Z0VsZW1PclN2Z1N0cmluZyA6IHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtKTtcbiAgICAgICAgICAgICAgICBzdmdFbGVtID0gaXNTdHJpbmcgPyBidWlsZFN2Z0VsZW1lbnQoc3ZnRWxlbU9yU3ZnU3RyaW5nLCB0cnVlKSA6IHN2Z0VsZW1PclN2Z1N0cmluZztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3ZnRWxlbSBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHtcbiAgICAgICAgICAgICAgdmFyIGhhc1VuaXF1ZUlkcyA9IE5VTEw7XG4gICAgICAgICAgICAgIGlmIChtYWtlSWRzVW5pcXVlT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgaGFzVW5pcXVlSWRzID0gbWFrZUlkc1VuaXF1ZShzdmdFbGVtLCBmYWxzZSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAodXNlQ2FjaGVPcHRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgdW5pcXVlSWRzU3ZnU3RyaW5nID0gaGFzVW5pcXVlSWRzICYmIHN2Z0VsZW1Ub1N2Z1N0cmluZyhzdmdFbGVtKTtcbiAgICAgICAgICAgICAgICAvLyBzZXQgYW4gYXJyYXkgd2l0aCB0aHJlZSBlbnRyaWVzIHRvIHRoZSBsb2FkIGNhY2hlXG4gICAgICAgICAgICAgICAgc2V0U3ZnTG9hZENhY2hlVmFsdWUoW2hhc1VuaXF1ZUlkcywgc3ZnU3RyaW5nLCB1bmlxdWVJZHNTdmdTdHJpbmddKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGluamVjdChpbWdFbGVtLCBzdmdFbGVtLCBhYnNVcmwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc3ZnSW52YWxpZChpbWdFbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgc2V0U3ZnTG9hZENhY2hlVmFsdWUoU1ZHX0lOVkFMSUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb25GaW5pc2goKTtcbiAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRGYWlsKGltZ0VsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgc2V0U3ZnTG9hZENhY2hlVmFsdWUoTE9BRF9GQUlMKTtcbiAgICAgICAgICAgIG9uRmluaXNoKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUpKSB7XG4gICAgICAgICAgICAvLyBzdmdJbmplY3RBdHRyaWJ1dGVWYWx1ZSBpcyBhbiBhcnJheS4gSW5qZWN0aW9uIGlzIG5vdCBjb21wbGV0ZSBzbyByZWdpc3RlciBjYWxsYmFja1xuICAgICAgICAgICAgc3ZnSW5qZWN0QXR0cmlidXRlVmFsdWUucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbWdOb3RTZXQoKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGRlZmF1bHQgW29wdGlvbnNdKCNvcHRpb25zKSBmb3IgU1ZHSW5qZWN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIGRlZmF1bHQgW29wdGlvbnNdKCNvcHRpb25zKSBmb3IgYW4gaW5qZWN0aW9uLlxuICAgICAqL1xuICAgIFNWR0luamVjdC5zZXRPcHRpb25zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgZGVmYXVsdE9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuICAgIH07XG5cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBTVkdJbmplY3RcbiAgICBTVkdJbmplY3QuY3JlYXRlID0gY3JlYXRlU1ZHSW5qZWN0O1xuXG5cbiAgICAvKipcbiAgICAgKiBVc2VkIGluIG9uZXJyb3IgRXZlbnQgb2YgYW4gYDxpbWc+YCBlbGVtZW50IHRvIGhhbmRsZSBjYXNlcyB3aGVuIHRoZSBsb2FkaW5nIHRoZSBvcmlnaW5hbCBzcmMgZmFpbHNcbiAgICAgKiAoZm9yIGV4YW1wbGUgaWYgZmlsZSBpcyBub3QgZm91bmQgb3IgaWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBTVkcpLiBUaGlzIHRyaWdnZXJzIGEgY2FsbCB0byB0aGVcbiAgICAgKiBvcHRpb25zIG9uRmFpbCBob29rIGlmIGF2YWlsYWJsZS4gVGhlIG9wdGlvbmFsIHNlY29uZCBwYXJhbWV0ZXIgd2lsbCBiZSBzZXQgYXMgdGhlIG5ldyBzcmMgYXR0cmlidXRlXG4gICAgICogZm9yIHRoZSBpbWcgZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEltYWdlRWxlbWVudH0gaW1nIC0gYW4gaW1nIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2ZhbGxiYWNrU3JjXSAtIG9wdGlvbmFsIHBhcmFtZXRlciBmYWxsYmFjayBzcmNcbiAgICAgKi9cbiAgICBTVkdJbmplY3QuZXJyID0gZnVuY3Rpb24oaW1nLCBmYWxsYmFja1NyYykge1xuICAgICAgaWYgKGltZykge1xuICAgICAgICBpZiAoaW1nW19fU1ZHSU5KRUNUXSAhPSBGQUlMKSB7XG4gICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoaW1nKTtcblxuICAgICAgICAgIGlmICghSVNfU1ZHX1NVUFBPUlRFRCkge1xuICAgICAgICAgICAgc3ZnTm90U3VwcG9ydGVkKGltZywgZGVmYXVsdE9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZW1vdmVPbkxvYWRBdHRyaWJ1dGUoaW1nKTtcbiAgICAgICAgICAgIGxvYWRGYWlsKGltZywgZGVmYXVsdE9wdGlvbnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmFsbGJhY2tTcmMpIHtcbiAgICAgICAgICAgIHJlbW92ZU9uTG9hZEF0dHJpYnV0ZShpbWcpO1xuICAgICAgICAgICAgaW1nLnNyYyA9IGZhbGxiYWNrU3JjO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW1nTm90U2V0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvd1tnbG9iYWxOYW1lXSA9IFNWR0luamVjdDtcblxuICAgIHJldHVybiBTVkdJbmplY3Q7XG4gIH1cblxuICB2YXIgU1ZHSW5qZWN0SW5zdGFuY2UgPSBjcmVhdGVTVkdJbmplY3QoJ1NWR0luamVjdCcpO1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU1ZHSW5qZWN0SW5zdGFuY2U7XG4gIH1cbn0pKHdpbmRvdywgZG9jdW1lbnQpOyIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyA9IG5ldyBVUkwoXCIuL2Fzc2V0cy9mb250cy9Sb2JvdG9fQ29uZGVuc2VkL3N0YXRpYy9Sb2JvdG9Db25kZW5zZWQtTWVkaXVtLnR0ZlwiLCBpbXBvcnQubWV0YS51cmwpO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX18gPSBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8wX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgQGZvbnQtZmFjZSB7XG4gIC8qIGh0dHBzOi8vZm9udHMuZ29vZ2xlLmNvbS9zcGVjaW1lbi9Sb2JvdG8rQ29uZGVuc2VkICovXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XG4gIHNyYzogdXJsKCR7X19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fX30pO1xuICBmb250LXdlaWdodDogNjAwO1xuICBmb250LXN0eWxlOiBub3JtYWw7XG59XG5cbiosXG4qOjpiZWZvcmUsXG4qOjphZnRlciB7XG4gIHBhZGRpbmc6IDA7XG4gIG1hcmdpbjogMDtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgZm9udC1zaXplOiAxNnB4O1xufVxuXG5ib2R5IHtcbiAgbWluLWhlaWdodDogMTAwc3ZoO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMTQ5LCAxMTYsIDU5KTtcbiAgZm9udC1mYW1pbHk6ICdSb2JvdG8gQ29uZGVuc2VkJywgQXJpYWw7XG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XG4gIGZvbnQtZmFtaWx5OiBBcmlhbDtcbn1cblxuI2JhdHRsZXNoaXBfYXBwIHtcbiAgbWluLWhlaWdodDogaW5oZXJpdDtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBtaW4tY29udGVudCAxZnI7XG59XG5cbiNtYWluX2NvbnRlbnQge1xuICAvKiBUZW1wb3JhcnkgKi9cbiAgLyogbWFyZ2luLXRvcDogNGVtOyAqL1xufVxuXG4jbWFpbl9jb250ZW50ID4gOmZpcnN0LWNoaWxkIHtcbiAgaGVpZ2h0OiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL2FwcC5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSx1REFBdUQ7RUFDdkQsK0JBQStCO0VBQy9CLDRDQUEyRTtFQUMzRSxnQkFBZ0I7RUFDaEIsa0JBQWtCO0FBQ3BCOztBQUVBOzs7RUFHRSxVQUFVO0VBQ1YsU0FBUztFQUNULHNCQUFzQjtFQUN0QixlQUFlO0FBQ2pCOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLG1DQUFtQztFQUNuQyxzQ0FBc0M7RUFDdEMsK0JBQStCO0VBQy9CLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLG1CQUFtQjtFQUNuQixhQUFhO0VBQ2IsbUNBQW1DO0FBQ3JDOztBQUVBO0VBQ0UsY0FBYztFQUNkLHFCQUFxQjtBQUN2Qjs7QUFFQTtFQUNFLFlBQVk7RUFDWixhQUFhO0VBQ2IsdUJBQXVCO0FBQ3pCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIkBmb250LWZhY2Uge1xcbiAgLyogaHR0cHM6Ly9mb250cy5nb29nbGUuY29tL3NwZWNpbWVuL1JvYm90bytDb25kZW5zZWQgKi9cXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCc7XFxuICBzcmM6IHVybCguL2Fzc2V0cy9mb250cy9Sb2JvdG9fQ29uZGVuc2VkL3N0YXRpYy9Sb2JvdG9Db25kZW5zZWQtTWVkaXVtLnR0Zik7XFxuICBmb250LXdlaWdodDogNjAwO1xcbiAgZm9udC1zdHlsZTogbm9ybWFsO1xcbn1cXG5cXG4qLFxcbio6OmJlZm9yZSxcXG4qOjphZnRlciB7XFxuICBwYWRkaW5nOiAwO1xcbiAgbWFyZ2luOiAwO1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIGZvbnQtc2l6ZTogMTZweDtcXG59XFxuXFxuYm9keSB7XFxuICBtaW4taGVpZ2h0OiAxMDBzdmg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMTQ5LCAxMTYsIDU5KTtcXG4gIGZvbnQtZmFtaWx5OiAnUm9ib3RvIENvbmRlbnNlZCcsIEFyaWFsO1xcbiAgZm9udC1mYW1pbHk6ICdSb2JvdG8gQ29uZGVuc2VkJztcXG4gIGZvbnQtZmFtaWx5OiBBcmlhbDtcXG59XFxuXFxuI2JhdHRsZXNoaXBfYXBwIHtcXG4gIG1pbi1oZWlnaHQ6IGluaGVyaXQ7XFxuICBkaXNwbGF5OiBncmlkO1xcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBtaW4tY29udGVudCAxZnI7XFxufVxcblxcbiNtYWluX2NvbnRlbnQge1xcbiAgLyogVGVtcG9yYXJ5ICovXFxuICAvKiBtYXJnaW4tdG9wOiA0ZW07ICovXFxufVxcblxcbiNtYWluX2NvbnRlbnQgPiA6Zmlyc3QtY2hpbGQge1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgYCNoZWFkZXIge1xuICBwYWRkaW5nOiAxZW0gMmVtIDRlbTtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDE2NSwgMTY1LCAxNjUpO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL2hlYWRlci5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxvQkFBb0I7RUFDcEIsb0NBQW9DO0FBQ3RDXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIiNoZWFkZXIge1xcbiAgcGFkZGluZzogMWVtIDJlbSA0ZW07XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMTY1LCAxNjUsIDE2NSk7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgI2hvbWUge1xufVxuXG4uZ2FtZW1vZGVfYnRucyB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBnYXA6IDJlbTtcbn1cblxuLmdhbWVtb2RlX2J0bnMgPiAqIHtcbiAgcGFkZGluZzogMmVtO1xufVxuXG4uZ2FtZW1vZGVfYnRucyA+ICogPiBzcGFuIHtcbiAgZm9udC1zaXplOiAyZW07XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9zdHlsZXMvaG9tZS5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7QUFDQTs7QUFFQTtFQUNFLGFBQWE7RUFDYixzQkFBc0I7RUFDdEIsdUJBQXVCO0VBQ3ZCLFFBQVE7QUFDVjs7QUFFQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLGNBQWM7QUFDaEJcIixcInNvdXJjZXNDb250ZW50XCI6W1wiI2hvbWUge1xcbn1cXG5cXG4uZ2FtZW1vZGVfYnRucyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbiAgZ2FwOiAyZW07XFxufVxcblxcbi5nYW1lbW9kZV9idG5zID4gKiB7XFxuICBwYWRkaW5nOiAyZW07XFxufVxcblxcbi5nYW1lbW9kZV9idG5zID4gKiA+IHNwYW4ge1xcbiAgZm9udC1zaXplOiAyZW07XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgI25hdmJhciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2Vlbjtcbn1cblxuI25hdmJhciA+ICoge1xuICBkaXNwbGF5OiBmbGV4O1xuICBsaXN0LXN0eWxlOiBub25lO1xufVxuXG4ubmF2X3JpZ2h0IHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xufVxuXG4ubmF2X3JpZ2h0ID4gOmxhc3QtY2hpbGQge1xuICAvKiBFeHBlcmltZW50aW5nICovXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgcmlnaHQ6IDA7XG4gIHRvcDogMWVtO1xuICBwYWRkaW5nOiAxcmVtO1xufVxuXG4ubmF2X2l0ZW0ubmF2X2xvZ28ge1xuICBkaXNwbGF5OiBmbGV4O1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL25hdmJhci5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxhQUFhO0VBQ2IsOEJBQThCO0FBQ2hDOztBQUVBO0VBQ0UsYUFBYTtFQUNiLGdCQUFnQjtBQUNsQjs7QUFFQTtFQUNFLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQixrQkFBa0I7RUFDbEIsUUFBUTtFQUNSLFFBQVE7RUFDUixhQUFhO0FBQ2Y7O0FBRUE7RUFDRSxhQUFhO0FBQ2ZcIixcInNvdXJjZXNDb250ZW50XCI6W1wiI25hdmJhciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcbn1cXG5cXG4jbmF2YmFyID4gKiB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG59XFxuXFxuLm5hdl9yaWdodCB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxufVxcblxcbi5uYXZfcmlnaHQgPiA6bGFzdC1jaGlsZCB7XFxuICAvKiBFeHBlcmltZW50aW5nICovXFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICByaWdodDogMDtcXG4gIHRvcDogMWVtO1xcbiAgcGFkZGluZzogMXJlbTtcXG59XFxuXFxuLm5hdl9pdGVtLm5hdl9sb2dvIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgLm5vdGlmaWNhdGlvbnNfY29udGFpbmVyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG59XG5gLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9zdHlsZXMvbm90aWZpY2F0aW9ucy5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxhQUFhO0VBQ2IsdUJBQXVCO0FBQ3pCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIi5ub3RpZmljYXRpb25zX2NvbnRhaW5lciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgLnBvcnRfbGluZXMge1xuICBkaXNwbGF5OiBmbGV4O1xufVxuXG4ucG9ydF9zaGlwIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBib3JkZXI6IDFweCBkb3R0ZWQgI2IyYjJiOTtcbiAgbWFyZ2luOiAwLjVlbTtcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXG59XG5cbi5zaGlwX2JveCB7XG4gIHotaW5kZXg6IDI7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAyNTUsIDAuMDUpO1xuICBib3JkZXI6IDJweCBzb2xpZCAjMDBmO1xuICBsZWZ0OiAwO1xuICB0b3A6IDA7XG4gIC8qIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAqL1xufVxuXG4uc2hpcF9ib3g6aG92ZXIge1xuICBjdXJzb3I6IG1vdmU7XG59XG5cbi5jZWxsX2NvbnRlbnQgPiAuc2hpcF9ib3gge1xuICAvKiBDb21tZW50IG91dCBpZiB1c2luZyBib3gtc2l6aW5nOiBjb250ZW50ICovXG4gIGxlZnQ6IC00JTtcbiAgdG9wOiAtNCU7XG59XG5cbi5zaGlwX2JveC5kcmFnZ2luZy5zaGlwX2JveF90cmFuc3BhcmVudCB7XG4gIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICBib3JkZXI6IHRyYW5zcGFyZW50O1xufVxuXG4uc2hpcF9ib3hfcGxhY2Vob2xkZXIge1xuICBib3JkZXItY29sb3I6ICM0MGJmNDQ7XG4gIGJhY2tncm91bmQ6IHJnYmEoNjQsIDE5MSwgNjgsIDAuMDUpO1xufVxuXG4ucm90YXRlX2Vycm9yIHtcbiAgYm9yZGVyLWNvbG9yOiByZWQ7XG4gIGFuaW1hdGlvbjogbGluZWFyIDAuMDA1cyBpbmZpbml0ZSBzaGFrZTtcbn1cblxuLmJ0bnNfY29udGFpbmVyIHtcbiAgZGlzcGxheTogZmxleDtcbn1cblxuLnJlc2V0X2J0bi5pbmFjdGl2ZSB7XG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xufVxuXG4ucmVzZXRfYnRuLmluYWN0aXZlID4gc3BhbiB7XG4gIG9wYWNpdHk6IDAuNTtcbn1cblxuLnJhbmRvbV9idG4ge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4ucmVhZHlfYnRuLmluYWN0aXZlIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuQGtleWZyYW1lcyBzaGFrZSB7XG4gIDAlIHtcbiAgICBsZWZ0OiAtNXB4O1xuICB9XG5cbiAgNTAlIHtcbiAgICBsZWZ0OiAwcHg7XG4gIH1cblxuICAxMDAlIHtcbiAgICBsZWZ0OiA1cHg7XG4gIH1cbn1cbmAsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL3N0eWxlcy9wb3J0LmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGFBQWE7QUFDZjs7QUFFQTtFQUNFLGtCQUFrQjtFQUNsQiwwQkFBMEI7RUFDMUIsYUFBYTtFQUNiLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFLFVBQVU7RUFDVixrQkFBa0I7RUFDbEIsaUNBQWlDO0VBQ2pDLHNCQUFzQjtFQUN0QixPQUFPO0VBQ1AsTUFBTTtFQUNOLDZCQUE2QjtBQUMvQjs7QUFFQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLDZDQUE2QztFQUM3QyxTQUFTO0VBQ1QsUUFBUTtBQUNWOztBQUVBO0VBQ0UsdUJBQXVCO0VBQ3ZCLG1CQUFtQjtBQUNyQjs7QUFFQTtFQUNFLHFCQUFxQjtFQUNyQixtQ0FBbUM7QUFDckM7O0FBRUE7RUFDRSxpQkFBaUI7RUFDakIsdUNBQXVDO0FBQ3pDOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0Usb0JBQW9CO0FBQ3RCOztBQUVBO0VBQ0UsWUFBWTtBQUNkOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0U7SUFDRSxVQUFVO0VBQ1o7O0VBRUE7SUFDRSxTQUFTO0VBQ1g7O0VBRUE7SUFDRSxTQUFTO0VBQ1g7QUFDRlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIucG9ydF9saW5lcyB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbn1cXG5cXG4ucG9ydF9zaGlwIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGJvcmRlcjogMXB4IGRvdHRlZCAjYjJiMmI5O1xcbiAgbWFyZ2luOiAwLjVlbTtcXG4gIC8qIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAqL1xcbn1cXG5cXG4uc2hpcF9ib3gge1xcbiAgei1pbmRleDogMjtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMjU1LCAwLjA1KTtcXG4gIGJvcmRlcjogMnB4IHNvbGlkICMwMGY7XFxuICBsZWZ0OiAwO1xcbiAgdG9wOiAwO1xcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXFxufVxcblxcbi5zaGlwX2JveDpob3ZlciB7XFxuICBjdXJzb3I6IG1vdmU7XFxufVxcblxcbi5jZWxsX2NvbnRlbnQgPiAuc2hpcF9ib3gge1xcbiAgLyogQ29tbWVudCBvdXQgaWYgdXNpbmcgYm94LXNpemluZzogY29udGVudCAqL1xcbiAgbGVmdDogLTQlO1xcbiAgdG9wOiAtNCU7XFxufVxcblxcbi5zaGlwX2JveC5kcmFnZ2luZy5zaGlwX2JveF90cmFuc3BhcmVudCB7XFxuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcXG4gIGJvcmRlcjogdHJhbnNwYXJlbnQ7XFxufVxcblxcbi5zaGlwX2JveF9wbGFjZWhvbGRlciB7XFxuICBib3JkZXItY29sb3I6ICM0MGJmNDQ7XFxuICBiYWNrZ3JvdW5kOiByZ2JhKDY0LCAxOTEsIDY4LCAwLjA1KTtcXG59XFxuXFxuLnJvdGF0ZV9lcnJvciB7XFxuICBib3JkZXItY29sb3I6IHJlZDtcXG4gIGFuaW1hdGlvbjogbGluZWFyIDAuMDA1cyBpbmZpbml0ZSBzaGFrZTtcXG59XFxuXFxuLmJ0bnNfY29udGFpbmVyIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxufVxcblxcbi5yZXNldF9idG4uaW5hY3RpdmUge1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxufVxcblxcbi5yZXNldF9idG4uaW5hY3RpdmUgPiBzcGFuIHtcXG4gIG9wYWNpdHk6IDAuNTtcXG59XFxuXFxuLnJhbmRvbV9idG4ge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuXFxuLnJlYWR5X2J0bi5pbmFjdGl2ZSB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG5cXG5Aa2V5ZnJhbWVzIHNoYWtlIHtcXG4gIDAlIHtcXG4gICAgbGVmdDogLTVweDtcXG4gIH1cXG5cXG4gIDUwJSB7XFxuICAgIGxlZnQ6IDBweDtcXG4gIH1cXG5cXG4gIDEwMCUge1xcbiAgICBsZWZ0OiA1cHg7XFxuICB9XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBgI2JvYXJkc19jb250YWluZXIge1xuICBtYXJnaW4tdG9wOiA0ZW07XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGdhcDogOHJlbTtcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICoge1xuICBkaXNwbGF5OiBmbGV4O1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICoud2FpdCA+ICo6bm90KC5nYW1lX3BsYXkpIHtcbiAgb3BhY2l0eTogMC40O1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gYnV0dG9uIHtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICBib3JkZXI6IG5vbmU7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKjpub3QoLndhaXQpID4gKiA+ICogPiAuY2VsbCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcCB7XG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xufVxuXG4ucGxheWVyX29uZSxcbi5wbGF5ZXJfdHdvIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICB3aWR0aDogbWluLWNvbnRlbnQ7XG59XG5cbi5wbGF5ZXJfdHdvLmluYWN0aXZlIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLnBsYXlfYnRuLmluYWN0aXZlIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLnBsYXlfYnRuIHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAyMCU7XG59XG5cbi5wbGF5X2J0biA+IGJ1dHRvbiB7XG4gIGZvbnQtc2l6ZTogNHJlbTtcbn1cblxuLmNlbGwgPiAqIHtcbiAgd2lkdGg6IDJlbTtcbiAgaGVpZ2h0OiAyZW07XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XG4gIC8qIHBvaW50ZXItZXZlbnRzOiBub25lOyAqL1xuICBib3JkZXI6IDFweCBzb2xpZCBibGFjaztcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXG59XG5cbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcbiAgLypcbiAgU2hvdyBzaGlwIGR1cmluZyBwbGFjaW5nIHNoaXBzIHBoYXNlXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxuICAqL1xuICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgaGVpZ2h0OiBpbmhlcml0O1xuICBiYWNrZ3JvdW5kLWNvbG9yOiBjb3JuZmxvd2VyYmx1ZTtcbn1cblxuLmNlbGwgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXIge1xuICBkaXNwbGF5OiBibG9jaztcbiAgLyogd2lkdGg6IDEwMCU7XG4gIGhlaWdodDogMTAwJTsgKi9cbiAgei1pbmRleDogLTE7XG59XG5cbi5jZWxsLmRvbmUgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXIge1xuICAvKiBib3JkZXI6IDJweCBzb2xpZCByZWQ7ICovXG59XG5cbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YmVmb3JlLFxuLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyOjphZnRlciB7XG4gIGNvbnRlbnQ6ICcnO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGJhY2tncm91bmQ6IHJlZDtcbiAgbGVmdDogNTAlO1xuICB3aWR0aDogMnB4O1xuICB0b3A6IC0yNSU7XG4gIGhlaWdodDogMTUwJTtcbiAgei1pbmRleDogLTE7XG59XG5cbi5jZWxsLmRvbmUgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xuICBib3JkZXI6IDJweCBzb2xpZCByZWQ7XG59XG5cbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXI6OmJlZm9yZSB7XG4gIHRyYW5zZm9ybTogcm90YXRlKDQ1ZGVnKTtcbiAgbWFyZ2luLXRvcDogLTFweDtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YWZ0ZXIge1xuICB0cmFuc2Zvcm06IHJvdGF0ZSgtNDVkZWcpO1xuICBtYXJnaW4tdG9wOiAxcHg7XG59XG5cbi8qICNib2FyZF9jb250YWluZXIgPiAqOm5vdCgud2FpdCkgPiAuYm9hcmQgPiAuYm9hcmRfcm93ID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwLCAqL1xuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdC5kb25lID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcbiAgLyogT3JpZ2luYWwgKi9cbiAgLyogYm9yZGVyOiAycHggc29saWQgcmVkOyAqL1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwOjpiZWZvcmUsXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwOjphZnRlciB7XG4gIC8qIE9yaWdpbmFsICovXG4gIGNvbnRlbnQ6ICcnO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGJhY2tncm91bmQ6IHJlZDtcbiAgbGVmdDogNTAlO1xuICB3aWR0aDogMnB4O1xuICB0b3A6IC0yNSU7XG4gIGhlaWdodDogMTUwJTtcbiAgei1pbmRleDogMjtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcDo6YmVmb3JlIHtcbiAgLyogT3JpZ2luYWwgKi9cbiAgdHJhbnNmb3JtOiByb3RhdGUoNDVkZWcpO1xuICBtYXJnaW4tdG9wOiAtMXB4O1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwOjphZnRlciB7XG4gIC8qIE9yaWdpbmFsICovXG4gIHRyYW5zZm9ybTogcm90YXRlKC00NWRlZyk7XG4gIG1hcmdpbi10b3A6IDFweDtcbn1cblxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXIge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHRvcDogNTAlO1xuICBsZWZ0OiA1MCU7XG4gIGhlaWdodDogNHB4O1xuICB3aWR0aDogNHB4O1xuICBiYWNrZ3JvdW5kOiAjMzMzO1xuICBib3JkZXItcmFkaXVzOiA1MCU7XG4gIG1hcmdpbi10b3A6IC0ycHg7XG4gIG1hcmdpbi1sZWZ0OiAtMnB4O1xuICB6LWluZGV4OiAxO1xufVxuXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwubWlzcyA+IC5jZWxsX2NvbnRlbnQge1xuICAvKiBiYWNrZ3JvdW5kLWNvbG9yOiBncmV5OyAqL1xuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTFlM2U4O1xufVxuXG4uY2VsbF9jb250ZW50ID4gLnJvd19tYXJrZXIge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAgbGVmdDogLTJlbTtcbiAgdG9wOiAwO1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICB6LWluZGV4OiAtMTtcbn1cblxuLmNlbGxfY29udGVudCA+IC5jb2xfbWFya2VyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IC0yZW07XG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgd2lkdGg6IDEwMCU7XG4gIHotaW5kZXg6IC0xO1xufVxuYCwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsZUFBZTtFQUNmLGFBQWE7RUFDYixTQUFTO0VBQ1QsaUJBQWlCO0FBQ25COztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0UsWUFBWTtBQUNkOztBQUVBO0VBQ0UsZUFBZTtFQUNmLFlBQVk7QUFDZDs7QUFFQTtFQUNFLDZCQUE2QjtBQUMvQjs7QUFFQTs7RUFFRSxrQkFBa0I7RUFDbEIsa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0UsYUFBYTtBQUNmOztBQUVBO0VBQ0UsY0FBYztFQUNkLGtCQUFrQjtFQUNsQixRQUFRO0FBQ1Y7O0FBRUE7RUFDRSxlQUFlO0FBQ2pCOztBQUVBO0VBQ0UsVUFBVTtFQUNWLFdBQVc7RUFDWCxrQkFBa0I7RUFDbEIsdUJBQXVCO0VBQ3ZCLDBCQUEwQjtFQUMxQix1QkFBdUI7RUFDdkIsNkJBQTZCO0FBQy9COztBQUVBO0VBQ0U7OztHQUdDO0VBQ0Qsb0JBQW9CO0VBQ3BCLGVBQWU7RUFDZixnQ0FBZ0M7QUFDbEM7O0FBRUE7RUFDRSxjQUFjO0VBQ2Q7aUJBQ2U7RUFDZixXQUFXO0FBQ2I7O0FBRUE7RUFDRSwyQkFBMkI7QUFDN0I7O0FBRUE7O0VBRUUsV0FBVztFQUNYLGtCQUFrQjtFQUNsQixlQUFlO0VBQ2YsU0FBUztFQUNULFVBQVU7RUFDVixTQUFTO0VBQ1QsWUFBWTtFQUNaLFdBQVc7QUFDYjs7QUFFQTtFQUNFLHFCQUFxQjtBQUN2Qjs7QUFFQTtFQUNFLHdCQUF3QjtFQUN4QixnQkFBZ0I7QUFDbEI7O0FBRUE7RUFDRSx5QkFBeUI7RUFDekIsZUFBZTtBQUNqQjs7QUFFQSwrRkFBK0Y7QUFDL0Y7RUFDRSxhQUFhO0VBQ2IsMkJBQTJCO0FBQzdCOztBQUVBOztFQUVFLGFBQWE7RUFDYixXQUFXO0VBQ1gsa0JBQWtCO0VBQ2xCLGVBQWU7RUFDZixTQUFTO0VBQ1QsVUFBVTtFQUNWLFNBQVM7RUFDVCxZQUFZO0VBQ1osVUFBVTtBQUNaOztBQUVBO0VBQ0UsYUFBYTtFQUNiLHdCQUF3QjtFQUN4QixnQkFBZ0I7QUFDbEI7O0FBRUE7RUFDRSxhQUFhO0VBQ2IseUJBQXlCO0VBQ3pCLGVBQWU7QUFDakI7O0FBRUE7RUFDRSxrQkFBa0I7RUFDbEIsUUFBUTtFQUNSLFNBQVM7RUFDVCxXQUFXO0VBQ1gsVUFBVTtFQUNWLGdCQUFnQjtFQUNoQixrQkFBa0I7RUFDbEIsZ0JBQWdCO0VBQ2hCLGlCQUFpQjtFQUNqQixVQUFVO0FBQ1o7O0FBRUE7RUFDRSw0QkFBNEI7RUFDNUIseUJBQXlCO0FBQzNCOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLFlBQVk7RUFDWixhQUFhO0VBQ2IsVUFBVTtFQUNWLE1BQU07RUFDTixtQkFBbUI7RUFDbkIsV0FBVztBQUNiOztBQUVBO0VBQ0Usa0JBQWtCO0VBQ2xCLFNBQVM7RUFDVCxrQkFBa0I7RUFDbEIsV0FBVztFQUNYLFdBQVc7QUFDYlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIjYm9hcmRzX2NvbnRhaW5lciB7XFxuICBtYXJnaW4tdG9wOiA0ZW07XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZ2FwOiA4cmVtO1xcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICoge1xcbiAgZGlzcGxheTogZmxleDtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqLndhaXQgPiAqOm5vdCguZ2FtZV9wbGF5KSB7XFxuICBvcGFjaXR5OiAwLjQ7XFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiBidXR0b24ge1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgYm9yZGVyOiBub25lO1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICo6bm90KC53YWl0KSA+ICogPiAqID4gLmNlbGwgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcblxcbi5wbGF5ZXJfb25lLFxcbi5wbGF5ZXJfdHdvIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHdpZHRoOiBtaW4tY29udGVudDtcXG59XFxuXFxuLnBsYXllcl90d28uaW5hY3RpdmUge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuXFxuLnBsYXlfYnRuLmluYWN0aXZlIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcblxcbi5wbGF5X2J0biB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMjAlO1xcbn1cXG5cXG4ucGxheV9idG4gPiBidXR0b24ge1xcbiAgZm9udC1zaXplOiA0cmVtO1xcbn1cXG5cXG4uY2VsbCA+ICoge1xcbiAgd2lkdGg6IDJlbTtcXG4gIGhlaWdodDogMmVtO1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxuICAvKiBwb2ludGVyLWV2ZW50czogbm9uZTsgKi9cXG4gIGJvcmRlcjogMXB4IHNvbGlkIGJsYWNrO1xcbiAgLyogYm94LXNpemluZzogY29udGVudC1ib3g7ICovXFxufVxcblxcbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcXG4gIC8qXFxuICBTaG93IHNoaXAgZHVyaW5nIHBsYWNpbmcgc2hpcHMgcGhhc2VcXG4gIFNob3cgb25seSBhY3RpdmUgcGxheWVyJ3Mgc2hpcCB3aGVuIGdhbWUgaXMgaW4gcGxheVxcbiAgKi9cXG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbiAgaGVpZ2h0OiBpbmhlcml0O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogY29ybmZsb3dlcmJsdWU7XFxufVxcblxcbi5jZWxsID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgLyogd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDEwMCU7ICovXFxuICB6LWluZGV4OiAtMTtcXG59XFxuXFxuLmNlbGwuZG9uZSA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlciB7XFxuICAvKiBib3JkZXI6IDJweCBzb2xpZCByZWQ7ICovXFxufVxcblxcbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YmVmb3JlLFxcbi5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YWZ0ZXIge1xcbiAgY29udGVudDogJyc7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBiYWNrZ3JvdW5kOiByZWQ7XFxuICBsZWZ0OiA1MCU7XFxuICB3aWR0aDogMnB4O1xcbiAgdG9wOiAtMjUlO1xcbiAgaGVpZ2h0OiAxNTAlO1xcbiAgei1pbmRleDogLTE7XFxufVxcblxcbi5jZWxsLmRvbmUgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAge1xcbiAgYm9yZGVyOiAycHggc29saWQgcmVkO1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5ibGFua193cmFwcGVyOjpiZWZvcmUge1xcbiAgdHJhbnNmb3JtOiByb3RhdGUoNDVkZWcpO1xcbiAgbWFyZ2luLXRvcDogLTFweDtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuYmxhbmtfd3JhcHBlcjo6YWZ0ZXIge1xcbiAgdHJhbnNmb3JtOiByb3RhdGUoLTQ1ZGVnKTtcXG4gIG1hcmdpbi10b3A6IDFweDtcXG59XFxuXFxuLyogI2JvYXJkX2NvbnRhaW5lciA+ICo6bm90KC53YWl0KSA+IC5ib2FyZCA+IC5ib2FyZF9yb3cgPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXAsICovXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdC5kb25lID4gLmNlbGxfY29udGVudCA+IC5zaGlwIHtcXG4gIC8qIE9yaWdpbmFsICovXFxuICAvKiBib3JkZXI6IDJweCBzb2xpZCByZWQ7ICovXFxufVxcblxcbiNib2FyZHNfY29udGFpbmVyID4gKiA+IC5ib2FyZCA+ICogPiAuY2VsbC5oaXQgPiAuY2VsbF9jb250ZW50ID4gLnNoaXA6OmJlZm9yZSxcXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwOjphZnRlciB7XFxuICAvKiBPcmlnaW5hbCAqL1xcbiAgY29udGVudDogJyc7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBiYWNrZ3JvdW5kOiByZWQ7XFxuICBsZWZ0OiA1MCU7XFxuICB3aWR0aDogMnB4O1xcbiAgdG9wOiAtMjUlO1xcbiAgaGVpZ2h0OiAxNTAlO1xcbiAgei1pbmRleDogMjtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLmhpdCA+IC5jZWxsX2NvbnRlbnQgPiAuc2hpcDo6YmVmb3JlIHtcXG4gIC8qIE9yaWdpbmFsICovXFxuICB0cmFuc2Zvcm06IHJvdGF0ZSg0NWRlZyk7XFxuICBtYXJnaW4tdG9wOiAtMXB4O1xcbn1cXG5cXG4jYm9hcmRzX2NvbnRhaW5lciA+ICogPiAuYm9hcmQgPiAqID4gLmNlbGwuaGl0ID4gLmNlbGxfY29udGVudCA+IC5zaGlwOjphZnRlciB7XFxuICAvKiBPcmlnaW5hbCAqL1xcbiAgdHJhbnNmb3JtOiByb3RhdGUoLTQ1ZGVnKTtcXG4gIG1hcmdpbi10b3A6IDFweDtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50ID4gLmJsYW5rX3dyYXBwZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiA1MCU7XFxuICBsZWZ0OiA1MCU7XFxuICBoZWlnaHQ6IDRweDtcXG4gIHdpZHRoOiA0cHg7XFxuICBiYWNrZ3JvdW5kOiAjMzMzO1xcbiAgYm9yZGVyLXJhZGl1czogNTAlO1xcbiAgbWFyZ2luLXRvcDogLTJweDtcXG4gIG1hcmdpbi1sZWZ0OiAtMnB4O1xcbiAgei1pbmRleDogMTtcXG59XFxuXFxuI2JvYXJkc19jb250YWluZXIgPiAqID4gLmJvYXJkID4gKiA+IC5jZWxsLm1pc3MgPiAuY2VsbF9jb250ZW50IHtcXG4gIC8qIGJhY2tncm91bmQtY29sb3I6IGdyZXk7ICovXFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTFlM2U4O1xcbn1cXG5cXG4uY2VsbF9jb250ZW50ID4gLnJvd19tYXJrZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGxlZnQ6IC0yZW07XFxuICB0b3A6IDA7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgei1pbmRleDogLTE7XFxufVxcblxcbi5jZWxsX2NvbnRlbnQgPiAuY29sX21hcmtlciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IC0yZW07XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB3aWR0aDogMTAwJTtcXG4gIHotaW5kZXg6IC0xO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gIE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gIEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKSB7XG4gIHZhciBsaXN0ID0gW107XG5cbiAgLy8gcmV0dXJuIHRoZSBsaXN0IG9mIG1vZHVsZXMgYXMgY3NzIHN0cmluZ1xuICBsaXN0LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICB2YXIgY29udGVudCA9IFwiXCI7XG4gICAgICB2YXIgbmVlZExheWVyID0gdHlwZW9mIGl0ZW1bNV0gIT09IFwidW5kZWZpbmVkXCI7XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpO1xuICAgICAgfVxuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBjb250ZW50ICs9IGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcoaXRlbSk7XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bNF0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0pLmpvaW4oXCJcIik7XG4gIH07XG5cbiAgLy8gaW1wb3J0IGEgbGlzdCBvZiBtb2R1bGVzIGludG8gdGhlIGxpc3RcbiAgbGlzdC5pID0gZnVuY3Rpb24gaShtb2R1bGVzLCBtZWRpYSwgZGVkdXBlLCBzdXBwb3J0cywgbGF5ZXIpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZXMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIHVuZGVmaW5lZF1dO1xuICAgIH1cbiAgICB2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuICAgIGlmIChkZWR1cGUpIHtcbiAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5sZW5ndGg7IGsrKykge1xuICAgICAgICB2YXIgaWQgPSB0aGlzW2tdWzBdO1xuICAgICAgICBpZiAoaWQgIT0gbnVsbCkge1xuICAgICAgICAgIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBfayA9IDA7IF9rIDwgbW9kdWxlcy5sZW5ndGg7IF9rKyspIHtcbiAgICAgIHZhciBpdGVtID0gW10uY29uY2F0KG1vZHVsZXNbX2tdKTtcbiAgICAgIGlmIChkZWR1cGUgJiYgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpdGVtWzBdXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbGF5ZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtWzVdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWVkaWEpIHtcbiAgICAgICAgaWYgKCFpdGVtWzJdKSB7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN1cHBvcnRzKSB7XG4gICAgICAgIGlmICghaXRlbVs0XSkge1xuICAgICAgICAgIGl0ZW1bNF0gPSBcIlwiLmNvbmNhdChzdXBwb3J0cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzRdID0gc3VwcG9ydHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGxpc3QucHVzaChpdGVtKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBsaXN0O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBpZiAoIXVybCkge1xuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgdXJsID0gU3RyaW5nKHVybC5fX2VzTW9kdWxlID8gdXJsLmRlZmF1bHQgOiB1cmwpO1xuXG4gIC8vIElmIHVybCBpcyBhbHJlYWR5IHdyYXBwZWQgaW4gcXVvdGVzLCByZW1vdmUgdGhlbVxuICBpZiAoL15bJ1wiXS4qWydcIl0kLy50ZXN0KHVybCkpIHtcbiAgICB1cmwgPSB1cmwuc2xpY2UoMSwgLTEpO1xuICB9XG4gIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICB1cmwgKz0gb3B0aW9ucy5oYXNoO1xuICB9XG5cbiAgLy8gU2hvdWxkIHVybCBiZSB3cmFwcGVkP1xuICAvLyBTZWUgaHR0cHM6Ly9kcmFmdHMuY3Nzd2cub3JnL2Nzcy12YWx1ZXMtMy8jdXJsc1xuICBpZiAoL1tcIicoKSBcXHRcXG5dfCglMjApLy50ZXN0KHVybCkgfHwgb3B0aW9ucy5uZWVkUXVvdGVzKSB7XG4gICAgcmV0dXJuIFwiXFxcIlwiLmNvbmNhdCh1cmwucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpLCBcIlxcXCJcIik7XG4gIH1cbiAgcmV0dXJuIHVybDtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgdmFyIGNvbnRlbnQgPSBpdGVtWzFdO1xuICB2YXIgY3NzTWFwcGluZyA9IGl0ZW1bM107XG4gIGlmICghY3NzTWFwcGluZykge1xuICAgIHJldHVybiBjb250ZW50O1xuICB9XG4gIGlmICh0eXBlb2YgYnRvYSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KGNzc01hcHBpbmcpKSkpO1xuICAgIHZhciBkYXRhID0gXCJzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxcIi5jb25jYXQoYmFzZTY0KTtcbiAgICB2YXIgc291cmNlTWFwcGluZyA9IFwiLyojIFwiLmNvbmNhdChkYXRhLCBcIiAqL1wiKTtcbiAgICByZXR1cm4gW2NvbnRlbnRdLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oXCJcXG5cIik7XG4gIH1cbiAgcmV0dXJuIFtjb250ZW50XS5qb2luKFwiXFxuXCIpO1xufTsiLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vYXBwLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vYXBwLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9oZWFkZXIuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9oZWFkZXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2hvbWUuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ob21lLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9uYXZiYXIuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9uYXZiYXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL25vdGlmaWNhdGlvbnMuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9ub3RpZmljYXRpb25zLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9wb3J0LmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vcG9ydC5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vc2NyZWVuQ29udHJvbGxlci5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3NjcmVlbkNvbnRyb2xsZXIuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzdHlsZXNJbkRPTSA9IFtdO1xuZnVuY3Rpb24gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICB2YXIgcmVzdWx0ID0gLTE7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3R5bGVzSW5ET00ubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3R5bGVzSW5ET01baV0uaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcikge1xuICAgICAgcmVzdWx0ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGlkQ291bnRNYXAgPSB7fTtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICB2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcbiAgICB2YXIgY291bnQgPSBpZENvdW50TWFwW2lkXSB8fCAwO1xuICAgIHZhciBpZGVudGlmaWVyID0gXCJcIi5jb25jYXQoaWQsIFwiIFwiKS5jb25jYXQoY291bnQpO1xuICAgIGlkQ291bnRNYXBbaWRdID0gY291bnQgKyAxO1xuICAgIHZhciBpbmRleEJ5SWRlbnRpZmllciA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgIHZhciBvYmogPSB7XG4gICAgICBjc3M6IGl0ZW1bMV0sXG4gICAgICBtZWRpYTogaXRlbVsyXSxcbiAgICAgIHNvdXJjZU1hcDogaXRlbVszXSxcbiAgICAgIHN1cHBvcnRzOiBpdGVtWzRdLFxuICAgICAgbGF5ZXI6IGl0ZW1bNV1cbiAgICB9O1xuICAgIGlmIChpbmRleEJ5SWRlbnRpZmllciAhPT0gLTEpIHtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS5yZWZlcmVuY2VzKys7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0udXBkYXRlcihvYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdXBkYXRlciA9IGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5ieUluZGV4ID0gaTtcbiAgICAgIHN0eWxlc0luRE9NLnNwbGljZShpLCAwLCB7XG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHVwZGF0ZXI6IHVwZGF0ZXIsXG4gICAgICAgIHJlZmVyZW5jZXM6IDFcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG4gIHJldHVybiBpZGVudGlmaWVycztcbn1cbmZ1bmN0aW9uIGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpIHtcbiAgdmFyIGFwaSA9IG9wdGlvbnMuZG9tQVBJKG9wdGlvbnMpO1xuICBhcGkudXBkYXRlKG9iaik7XG4gIHZhciB1cGRhdGVyID0gZnVuY3Rpb24gdXBkYXRlcihuZXdPYmopIHtcbiAgICBpZiAobmV3T2JqKSB7XG4gICAgICBpZiAobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwICYmIG5ld09iai5zdXBwb3J0cyA9PT0gb2JqLnN1cHBvcnRzICYmIG5ld09iai5sYXllciA9PT0gb2JqLmxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFwaS51cGRhdGUob2JqID0gbmV3T2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBpLnJlbW92ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHVwZGF0ZXI7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgdmFyIGxhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG4gICAgbmV3TGlzdCA9IG5ld0xpc3QgfHwgW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpZGVudGlmaWVyID0gbGFzdElkZW50aWZpZXJzW2ldO1xuICAgICAgdmFyIGluZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleF0ucmVmZXJlbmNlcy0tO1xuICAgIH1cbiAgICB2YXIgbmV3TGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKG5ld0xpc3QsIG9wdGlvbnMpO1xuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuICAgICAgdmFyIF9pbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKF9pZGVudGlmaWVyKTtcbiAgICAgIGlmIChzdHlsZXNJbkRPTVtfaW5kZXhdLnJlZmVyZW5jZXMgPT09IDApIHtcbiAgICAgICAgc3R5bGVzSW5ET01bX2luZGV4XS51cGRhdGVyKCk7XG4gICAgICAgIHN0eWxlc0luRE9NLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBsYXN0SWRlbnRpZmllcnMgPSBuZXdMYXN0SWRlbnRpZmllcnM7XG4gIH07XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbWVtbyA9IHt9O1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGdldFRhcmdldCh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiBtZW1vW3RhcmdldF0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgc3R5bGVUYXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCk7XG5cbiAgICAvLyBTcGVjaWFsIGNhc2UgdG8gcmV0dXJuIGhlYWQgb2YgaWZyYW1lIGluc3RlYWQgb2YgaWZyYW1lIGl0c2VsZlxuICAgIGlmICh3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQgJiYgc3R5bGVUYXJnZXQgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgIC8vIGR1ZSB0byBjcm9zcy1vcmlnaW4gcmVzdHJpY3Rpb25zXG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gc3R5bGVUYXJnZXQuY29udGVudERvY3VtZW50LmhlYWQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0XG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgbWVtb1t0YXJnZXRdID0gc3R5bGVUYXJnZXQ7XG4gIH1cbiAgcmV0dXJuIG1lbW9bdGFyZ2V0XTtcbn1cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRCeVNlbGVjdG9yKGluc2VydCwgc3R5bGUpIHtcbiAgdmFyIHRhcmdldCA9IGdldFRhcmdldChpbnNlcnQpO1xuICBpZiAoIXRhcmdldCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGZpbmQgYSBzdHlsZSB0YXJnZXQuIFRoaXMgcHJvYmFibHkgbWVhbnMgdGhhdCB0aGUgdmFsdWUgZm9yIHRoZSAnaW5zZXJ0JyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG4gIH1cbiAgdGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0QnlTZWxlY3RvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgb3B0aW9ucy5zZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gIG9wdGlvbnMuaW5zZXJ0KGVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG4gIHJldHVybiBlbGVtZW50O1xufVxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzKHN0eWxlRWxlbWVudCkge1xuICB2YXIgbm9uY2UgPSB0eXBlb2YgX193ZWJwYWNrX25vbmNlX18gIT09IFwidW5kZWZpbmVkXCIgPyBfX3dlYnBhY2tfbm9uY2VfXyA6IG51bGw7XG4gIGlmIChub25jZSkge1xuICAgIHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJub25jZVwiLCBub25jZSk7XG4gIH1cbn1cbm1vZHVsZS5leHBvcnRzID0gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG4gIHZhciBjc3MgPSBcIlwiO1xuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQob2JqLnN1cHBvcnRzLCBcIikge1wiKTtcbiAgfVxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwiQG1lZGlhIFwiLmNvbmNhdChvYmoubWVkaWEsIFwiIHtcIik7XG4gIH1cbiAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBvYmoubGF5ZXIgIT09IFwidW5kZWZpbmVkXCI7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJAbGF5ZXJcIi5jb25jYXQob2JqLmxheWVyLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQob2JqLmxheWVyKSA6IFwiXCIsIFwiIHtcIik7XG4gIH1cbiAgY3NzICs9IG9iai5jc3M7XG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG4gIHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuICBpZiAoc291cmNlTWFwICYmIHR5cGVvZiBidG9hICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgY3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIi5jb25jYXQoYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSwgXCIgKi9cIik7XG4gIH1cblxuICAvLyBGb3Igb2xkIElFXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAgKi9cbiAgb3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbn1cbmZ1bmN0aW9uIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpIHtcbiAgLy8gaXN0YW5idWwgaWdub3JlIGlmXG4gIGlmIChzdHlsZUVsZW1lbnQucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBzdHlsZUVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQpO1xufVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGRvbUFQSShvcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUoKSB7fSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cbiAgICB9O1xuICB9XG4gIHZhciBzdHlsZUVsZW1lbnQgPSBvcHRpb25zLmluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICAgIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge1xuICAgICAgcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG4gICAgfVxuICB9O1xufVxubW9kdWxlLmV4cG9ydHMgPSBkb21BUEk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc3R5bGVUYWdUcmFuc2Zvcm0oY3NzLCBzdHlsZUVsZW1lbnQpIHtcbiAgaWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgIHN0eWxlRWxlbWVudC5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBzdHlsZVRhZ1RyYW5zZm9ybTsiLCJpbXBvcnQgJ0BpY29uZnUvc3ZnLWluamVjdCc7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgYnVpbGRIZWFkZXIgZnJvbSAnLi9jb21wb25lbnRzL2hlYWRlci9oZWFkZXInO1xuaW1wb3J0IGJ1aWxkTWFpbiBmcm9tICcuL2NvbXBvbmVudHMvbWFpbi9tYWluJztcbmltcG9ydCAnLi9hcHAuY3NzJztcblxuKCgpID0+IHtcbiAgY29uc3QgYnVpbGQgPSB7XG4gICAgaGVhZGVyOiBidWlsZEhlYWRlcixcbiAgICBtYWluOiBidWlsZE1haW4sXG4gIH07XG5cbiAgY29uc3QgYXBwID0ge1xuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgYXBwV3JhcHBlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgYXBwV3JhcHBlci5pZCA9ICdiYXR0bGVzaGlwX2FwcCc7XG5cbiAgICAgIGFwcFdyYXBwZXIuYXBwZW5kQ2hpbGQoYnVpbGQuaGVhZGVyKCkpO1xuICAgICAgYXBwV3JhcHBlci5hcHBlbmRDaGlsZChidWlsZC5tYWluKCkpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhcHBXcmFwcGVyKTtcbiAgICB9LFxuICB9O1xuXG4gIGFwcC5pbml0KCk7XG59KSgpO1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcblxuZXhwb3J0IGRlZmF1bHQgKHBsYXllckJvYXJkKSA9PiB7XG4gIGNvbnN0IGJvYXJkID0ge1xuICAgIHJlbmRlcihib2FyZCkge1xuICAgICAgY29uc3QgcGxheWVyQm9hcmQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHBsYXllckJvYXJkLmNsYXNzTGlzdC5hZGQoJ2JvYXJkJyk7XG4gICAgICBib2FyZC5mb3JFYWNoKChyb3csIHkpID0+IHtcbiAgICAgICAgY29uc3QgYm9hcmRSb3cgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgYm9hcmRSb3cuY2xhc3NMaXN0LmFkZCgnYm9hcmRfcm93Jyk7XG4gICAgICAgIHJvdy5mb3JFYWNoKChjZWxsLCB4KSA9PiB7XG4gICAgICAgICAgY29uc3QgY2VsbEJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICAgIGNlbGxCdG4uc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICBjbGFzczogJ2NlbGwnLFxuICAgICAgICAgICAgWydkYXRhLXgnXTogeCArIDEsXG4gICAgICAgICAgICBbJ2RhdGEteSddOiByb3cubGVuZ3RoIC0geSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBOZWVkIHRvIHNob3cgb25seSBhY3RpdmVQbGF5ZXIncyBzaGlwc1xuICAgICAgICAgIC8vIE5lZWQgdG8gaGlkZSB0aGUgb3Bwb25lbnQncyBzaGlwcyB3aGVuIGFjdGl2ZVBsYXllciBjaGFuZ2VzXG4gICAgICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICBjb25zdCBibGFua1dyYXBwZXIgPSBjcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgYmxhbmtXcmFwcGVyLmNsYXNzTGlzdC5hZGQoJ2JsYW5rX3dyYXBwZXInKTtcbiAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChibGFua1dyYXBwZXIpO1xuICAgICAgICAgIGlmIChjZWxsLnNoaXApIHtcbiAgICAgICAgICAgIC8vIFByb2JsZW0sIGFsbG93cyBvcHBvbmVudHMgdG8gY2hlYXQgaW4gYSBicm93c2VyIGRldmVsb3BlciB0b29sc1xuICAgICAgICAgICAgY29uc3QgY2VsbFNoaXAgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGNlbGxTaGlwLmNsYXNzTGlzdC5hZGQoJ3NoaXAnKTtcbiAgICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKGNlbGxTaGlwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2VsbENvbnRlbnQuY2xhc3NMaXN0LmFkZCgnY2VsbF9jb250ZW50Jyk7XG4gICAgICAgICAgY2VsbEJ0bi5hcHBlbmRDaGlsZChjZWxsQ29udGVudCk7XG4gICAgICAgICAgLy8gTmVlZCB0byBjaGVjayBmb3IgbGVmdCBhbmQgdG9wIGVkZ2VzIG9mIGJvYXJkXG4gICAgICAgICAgLy8gVG8gY3JlYXRlIHJvdyBhbmQgY29sdW1uIGxhYmVsc1xuICAgICAgICAgIGlmICh4ID09PSAwIHx8IHkgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd01hcmtlciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgY29uc3QgY29sTWFya2VyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgICByb3dNYXJrZXIuc2V0QXR0cmlidXRlcyh7IGNsYXNzOiAncm93X21hcmtlcicsIHRleHRDb250ZW50OiBgJHt5ICsgMX1gIH0pO1xuICAgICAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChyb3dNYXJrZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoeSA9PT0gMCkge1xuICAgICAgICAgICAgICBjb2xNYXJrZXIuc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdjb2xfbWFya2VyJyxcbiAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogYCR7U3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIHgpfWAsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZChjb2xNYXJrZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBib2FyZFJvdy5hcHBlbmRDaGlsZChjZWxsQnRuKTtcbiAgICAgICAgICAvLyBwbGF5ZXJCb2FyZC5hcHBlbmRDaGlsZChjZWxsQnRuKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHBsYXllckJvYXJkLmFwcGVuZENoaWxkKGJvYXJkUm93KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBsYXllckJvYXJkO1xuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIGJvYXJkLnJlbmRlcihwbGF5ZXJCb2FyZCk7XG59O1xuIiwiIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBoZWFkZXJDb25maWcgZnJvbSAnLi9oZWFkZXIuY29uZmlnJztcbmltcG9ydCBuYXZiYXIgZnJvbSAnLi9uYXZiYXIvbmF2YmFyJztcbmltcG9ydCBub3RpZmljYXRpb25zIGZyb20gJy4vbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL2hlYWRlci5jc3MnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIGNvbnN0IGhlYWRlciA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5oZWFkZXIgPSBlbGVtZW50O1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHt9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGhlYWRlckVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KCdoZWFkZXInKTtcbiAgICAgIGhlYWRlckVsZW1lbnQuaWQgPSAnaGVhZGVyJztcbiAgICAgIGhlYWRlckVsZW1lbnQuYXBwZW5kQ2hpbGQobmF2YmFyKCkpO1xuICAgICAgaGVhZGVyRWxlbWVudC5hcHBlbmRDaGlsZChub3RpZmljYXRpb25zKCkpO1xuICAgICAgdGhpcy5jYWNoZURPTShoZWFkZXJFbGVtZW50KTtcblxuICAgICAgcmV0dXJuIGhlYWRlckVsZW1lbnQ7XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gaGVhZGVyLnJlbmRlcigpO1xufTtcbiIsImltcG9ydCBJY29uR2l0aHViIGZyb20gJy4uLy4uLy4uL2Fzc2V0cy9pY29ucy9naXRodWJfbWFyay9naXRodWItbWFyay13aGl0ZS5zdmcnO1xuXG5leHBvcnQgZGVmYXVsdCBbXG4gIHtcbiAgICBlbGVtZW50OiAndWwnLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgIGNsYXNzOiAnbmF2X2xlZnQnLFxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2xpJyxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnYScsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIGhyZWY6ICcjJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbSBuYXZfbG9nbycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdpbWcnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHNyYzogJyMnLFxuICAgICAgICAgICAgICAgICAgLy8gb25sb2FkOiAnU1ZHSW5qZWN0KHRoaXMpJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2gxJyxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ0JhdHRsZXNoaXAnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG4gIHtcbiAgICBlbGVtZW50OiAndWwnLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgIGNsYXNzOiAnbmF2X3JpZ2h0JyxcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnIycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0nLFxuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1BsYWNlaG9sZGVyJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnIycsXG4gICAgICAgICAgICAgIGNsYXNzOiAnbmF2X2l0ZW0nLFxuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1BsYWNlaG9sZGVyJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnaHR0cHM6Ly9naXRodWIuY29tL21pa2V5Q29zL2JhdHRsZXNoaXAvdHJlZS9tYWluJyxcbiAgICAgICAgICAgICAgdGFyZ2V0OiAnX2JsYW5rJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdpbWcnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHNyYzogSWNvbkdpdGh1YixcbiAgICAgICAgICAgICAgICAgIG9ubG9hZDogJ1NWR0luamVjdCh0aGlzKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGVsZW1lbnQ6ICdsaScsXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ2EnLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICBocmVmOiAnaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgIHRhcmdldDogJ19zZWxmJyxcbiAgICAgICAgICAgICAgY2xhc3M6ICduYXZfaXRlbSBsZWF2ZV9nYW1lJyxcbiAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdMZWF2ZSBnYW1lJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbl07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IG5hdmJhckNvbmZpZyBmcm9tICcuL25hdmJhci5jb25maWcnO1xuaW1wb3J0ICcuLi8uLi8uLi9zdHlsZXMvbmF2YmFyLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgbmF2YmFyID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLm5hdmJhciA9IGVsZW1lbnQ7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge30sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgbmF2RWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoJ25hdicpO1xuICAgICAgbmF2RWxlbWVudC5pZCA9ICduYXZiYXInO1xuXG4gICAgICBuYXZiYXJDb25maWcuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCBuYXZDaGlsZCA9IGNyZWF0ZUVsZW1lbnQoaXRlbS5lbGVtZW50KTtcbiAgICAgICAgbmF2Q2hpbGQuc2V0QXR0cmlidXRlcyhpdGVtLmF0dHJpYnV0ZXMpO1xuICAgICAgICBuYXZDaGlsZC5zZXRDaGlsZHJlbihpdGVtLmNoaWxkcmVuKTtcbiAgICAgICAgbmF2RWxlbWVudC5hcHBlbmRDaGlsZChuYXZDaGlsZCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5jYWNoZURPTShuYXZFbGVtZW50KTtcbiAgICAgIHJldHVybiBuYXZFbGVtZW50O1xuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIG5hdmJhci5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgJy4uLy4uLy4uL3N0eWxlcy9ub3RpZmljYXRpb25zLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3Qgbm90aWZpY2F0aW9ucyA9IHtcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy51cGRhdGVOb3RpZmljYXRpb24gPSB0aGlzLnVwZGF0ZU5vdGlmaWNhdGlvbi5iaW5kKHRoaXMpO1xuICAgIH0sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5ub3RpZmljYXRpb25NZXNzYWdlID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcjbm90aWZpY2F0aW9uX21lc3NhZ2UnKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKCdub3RpZnknLCB0aGlzLnVwZGF0ZU5vdGlmaWNhdGlvbik7XG4gICAgfSxcbiAgICByZW5kZXIoKSB7XG4gICAgICBjb25zdCBub3RpZmljYXRpb25zQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBub3RpZmljYXRpb25NZXNzYWdlID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgIG5vdGlmaWNhdGlvbnNDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnbm90aWZpY2F0aW9uc19jb250YWluZXInKTtcbiAgICAgIG5vdGlmaWNhdGlvbk1lc3NhZ2Uuc2V0QXR0cmlidXRlcyh7XG4gICAgICAgIGlkOiAnbm90aWZpY2F0aW9uX21lc3NhZ2UnLFxuICAgICAgICB0ZXh0Q29udGVudDogJ1BpY2sgZ2FtZSBtb2RlJyxcbiAgICAgIH0pO1xuXG4gICAgICBub3RpZmljYXRpb25zQ29udGFpbmVyLmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbk1lc3NhZ2UpO1xuICAgICAgdGhpcy5jYWNoZURPTShub3RpZmljYXRpb25zQ29udGFpbmVyKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuXG4gICAgICByZXR1cm4gbm90aWZpY2F0aW9uc0NvbnRhaW5lcjtcbiAgICB9LFxuICAgIHVwZGF0ZU5vdGlmaWNhdGlvbih0ZXh0KSB7XG4gICAgICB0aGlzLm5vdGlmaWNhdGlvbk1lc3NhZ2UudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgIH0sXG4gIH07XG5cbiAgbm90aWZpY2F0aW9ucy5pbml0KCk7XG4gIHJldHVybiBub3RpZmljYXRpb25zLnJlbmRlcigpO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IFtcbiAgLy8ge1xuICAvLyAgIGVsZW1lbnQ6ICdoMicsXG4gIC8vICAgYXR0cmlidXRlczoge1xuICAvLyAgICAgdGV4dENvbnRlbnQ6ICdCYXR0bGVzaGlwJyxcbiAgLy8gICB9LFxuICAvLyB9LFxuICB7XG4gICAgZWxlbWVudDogJ3NlY3Rpb24nLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgIGNsYXNzOiAnZ2FtZW1vZGVfYnRucycsXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAge1xuICAgICAgICBlbGVtZW50OiAnYnV0dG9uJyxcbiAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgIGNsYXNzOiAnZ2FtZW1vZGVfYnRuIGh1bWFuX2h1bWFuJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgIHRleHRDb250ZW50OiAnaHVtYW4gdnMgaHVtYW4nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICBjbGFzczogJ2dhbWVtb2RlX2J0biBodW1hbl9jb21wdXRlcicsXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ2h1bWFuIHZzIGNvbXB1dGVyJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbl07XG4iLCJpbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IGhvbWVDb25maWcgZnJvbSAnLi9ob21lLmNvbmZpZyc7XG5pbXBvcnQgcHViU3ViIGZyb20gJy4uLy4uL2NvbnRhaW5lcnMvcHViU3ViJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL2hvbWUuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBob21lID0ge1xuICAgIGluaXQoKSB7fSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmhvbWUgPSBlbGVtZW50O1xuICAgICAgdGhpcy5oZWFkZXIgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvcignaDInKTtcbiAgICAgIHRoaXMubW9kZUJ0bnMgPSB0aGlzLmhvbWUucXVlcnlTZWxlY3RvckFsbCgnLmdhbWVtb2RlX2J0bicpO1xuICAgICAgY29uc29sZS5sb2codGhpcy5ob21lKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMubW9kZUJ0bnMpO1xuICAgIH0sXG4gICAgYmluZEV2ZW50cygpIHtcbiAgICAgIHRoaXMuc2V0R2FtZU1vZGUgPSB0aGlzLnNldEdhbWVNb2RlLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLm1vZGVCdG5zLmZvckVhY2goKGJ0bikgPT4gYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zZXRHYW1lTW9kZSkpO1xuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3QgaG9tZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgaG9tZUNvbnRhaW5lci5pZCA9ICdob21lJztcblxuICAgICAgaG9tZUNvbmZpZy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IGhvbWVDaGlsZCA9IGNyZWF0ZUVsZW1lbnQoaXRlbS5lbGVtZW50KTtcbiAgICAgICAgaWYgKGl0ZW0uYXR0cmlidXRlcykgaG9tZUNoaWxkLnNldEF0dHJpYnV0ZXMoaXRlbS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgaWYgKGl0ZW0uY2hpbGRyZW4pIGhvbWVDaGlsZC5zZXRDaGlsZHJlbihpdGVtLmNoaWxkcmVuKTtcbiAgICAgICAgaG9tZUNvbnRhaW5lci5hcHBlbmRDaGlsZChob21lQ2hpbGQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuY2FjaGVET00oaG9tZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIHJldHVybiBob21lQ29udGFpbmVyO1xuICAgIH0sXG4gICAgc2V0R2FtZU1vZGUoZSkge1xuICAgICAgY29uc3QgZ2FtZW1vZGUgPSAhZS5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC52YWx1ZS5pbmNsdWRlcygnY29tcHV0ZXInKTtcbiAgICAgIGNvbnNvbGUubG9nKGdhbWVtb2RlKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdtYWluX3JlbmRlcicsIGdhbWVtb2RlKTtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBob21lLnJlbmRlcigpO1xufTtcbiIsIiIsImltcG9ydCBjcmVhdGVFbGVtZW50IGZyb20gJy4uLy4uL2hlbHBlcnMvY3JlYXRlRWxlbWVudCc7XG5pbXBvcnQgc2NyZWVuQ29udHJvbGxlciBmcm9tICcuLi9zY3JlZW4vc2NyZWVuQ29udHJvbGxlcic7XG5pbXBvcnQgbWFpbkNvbmZpZyBmcm9tICcuL21haW4uY29uZmlnJztcbmltcG9ydCBidWlsZEhvbWUgZnJvbSAnLi4vaG9tZS9ob21lJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuaW1wb3J0IGdhbWVJbml0IGZyb20gJy4uL3NjcmVlbi9zY3JlZW5Db250cm9sbGVyJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCBidWlsZCA9IHtcbiAgICBob21lOiBidWlsZEhvbWUsXG4gICAgZ2FtZTogc2NyZWVuQ29udHJvbGxlcixcbiAgfTtcbiAgY29uc3QgbWFpbiA9IHtcbiAgICBpbml0KCkge30sXG4gICAgY2FjaGVET00oZWxlbWVudCkge1xuICAgICAgdGhpcy5tYWluID0gZWxlbWVudDtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMubWFpbik7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpO1xuICAgICAgcHViU3ViLnN1YnNjcmliZSgnbWFpbl9yZW5kZXInLCB0aGlzLnJlbmRlcik7XG4gICAgfSxcbiAgICByZW5kZXIobW9kZSkge1xuICAgICAgaWYgKG1vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBtYWluQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIG1haW5Db250YWluZXIuaWQgPSAnbWFpbl9jb250ZW50JztcbiAgICAgICAgbWFpbkNvbnRhaW5lci5hcHBlbmRDaGlsZChidWlsZC5ob21lKCkpO1xuICAgICAgICB0aGlzLmNhY2hlRE9NKG1haW5Db250YWluZXIpO1xuICAgICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIG1haW5Db250YWluZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1haW4uZmlyc3RFbGVtZW50Q2hpbGQucmVwbGFjZVdpdGgoYnVpbGQuZ2FtZShtb2RlKSk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gbWFpbi5yZW5kZXIoKTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGVsZW1lbnQ6ICdkaXYnLFxuICBhdHRyaWJ1dGVzOiB7XG4gICAgY2xhc3M6ICdwb3J0JyxcbiAgfSxcbiAgY2hpbGRyZW46IFtcbiAgICB7XG4gICAgICBlbGVtZW50OiAncCcsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIHRleHRDb250ZW50OiAnRHJhZyB0aGUgc2hpcHMgdG8gdGhlIGdyaWQsIGFuZCB0aGVuIGNsaWNrIHRvIHJvdGF0ZTonLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICBjbGFzczogJ3BvcnRfbGluZXMnLFxuICAgICAgfSxcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA4ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICc0JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDhlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgIH0sXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMycsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA2ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICczJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDZlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdwb3J0X2xpbmVzJyxcbiAgICAgIH0sXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMicsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiA0ZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcyJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDRlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDRlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1sZW5ndGgnXTogJzInLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogNGVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICBjbGFzczogJ3BvcnRfbGluZXMnLFxuICAgICAgfSxcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncG9ydF9zaGlwJyxcbiAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdzaGlwX2JveCcsXG4gICAgICAgICAgICAgICAgWydkYXRhLWlkJ106ICcnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1sZW5ndGgnXTogJzEnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1vcmllbnRhdGlvbiddOiAnaCcsXG4gICAgICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgY2xhc3M6ICdwb3J0X3NoaXAnLFxuICAgICAgICAgICAgc3R5bGU6ICd3aWR0aDogMmVtOyBoZWlnaHQ6IDJlbTsnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3NoaXBfYm94JyxcbiAgICAgICAgICAgICAgICAvLyBkcmFnZ2FibGU6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtaWQnXTogJycsXG4gICAgICAgICAgICAgICAgWydkYXRhLWxlbmd0aCddOiAnMScsXG4gICAgICAgICAgICAgICAgWydkYXRhLW9yaWVudGF0aW9uJ106ICdoJyxcbiAgICAgICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICBjbGFzczogJ3BvcnRfc2hpcCcsXG4gICAgICAgICAgICBzdHlsZTogJ3dpZHRoOiAyZW07IGhlaWdodDogMmVtOycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnc2hpcF9ib3gnLFxuICAgICAgICAgICAgICAgIFsnZGF0YS1pZCddOiAnJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtbGVuZ3RoJ106ICcxJyxcbiAgICAgICAgICAgICAgICBbJ2RhdGEtb3JpZW50YXRpb24nXTogJ2gnLFxuICAgICAgICAgICAgICAgIHN0eWxlOiAnd2lkdGg6IDJlbTsgaGVpZ2h0OiAyZW07JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgICB7XG4gICAgICBlbGVtZW50OiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgY2xhc3M6ICdidG5zX2NvbnRhaW5lcicsXG4gICAgICB9LFxuICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncmVzZXQnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3Jlc2V0X2J0biBpbmFjdGl2ZScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLFxuICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudDogJ1Jlc2V0JyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncmFuZG9tJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGVsZW1lbnQ6ICdidXR0b24nLFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdyYW5kb21fYnRuJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsXG4gICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50OiAnUmFuZG9taXplJyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIGNsYXNzOiAncmVhZHknLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZWxlbWVudDogJ2J1dHRvbicsXG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3JlYWR5X2J0biBpbmFjdGl2ZScsXG4gICAgICAgICAgICAgICAgWydkYXRhLXJlYWR5J106IGZhbHNlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJyxcbiAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQ6ICdSZWFkeScsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIF0sXG59O1xuIiwiaW1wb3J0IGNyZWF0ZUVsZW1lbnQgZnJvbSAnLi4vLi4vaGVscGVycy9jcmVhdGVFbGVtZW50JztcbmltcG9ydCBwb3J0Q29uZmlnIGZyb20gJy4vcG9ydC5jb25maWcnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgYm9hcmQgZnJvbSAnLi4vYm9hcmQvYm9hcmQnO1xuXG5leHBvcnQgZGVmYXVsdCAocGxheWVyLCBnYW1lLCBtb2RlKSA9PiB7XG4gIGNvbnN0IHBvcnQgPSB7XG4gICAgLy8gUmVuYW1lIHRvIHBvcnRDb250cm9sbGVyIG9yIHNoaXBzQ29udHJvbGxlcj9cbiAgICBwbGF5ZXIsXG4gICAgZ2FtZSxcbiAgICBtb2RlLFxuICAgIGluaXQoKSB7XG4gICAgICB0aGlzLmRyYWdTdGFydEhhbmRsZXIgPSB0aGlzLmRyYWdTdGFydEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuZHJhZ0VuZEhhbmRsZXIgPSB0aGlzLmRyYWdFbmRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmRyYWdNb3ZlSGFuZGxlciA9IHRoaXMuZHJhZ01vdmVIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmRyb3BIYW5kbGVyID0gdGhpcy5kcm9wSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5yb3RhdGVIYW5kbGVyID0gdGhpcy5yb3RhdGVIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmRyYWdTdGFydEhhbmRsZXIgPSB0aGlzLmRyYWdTdGFydEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMucmVzZXRIYW5kbGVyID0gdGhpcy5yZXNldEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMucmVhZHlIYW5kbGVyID0gdGhpcy5yZWFkeUhhbmRsZXIuYmluZCh0aGlzKTtcblxuICAgICAgdGhpcy5wbGF5ZXJCb2FyZCA9XG4gICAgICAgIHBsYXllciA9PT0gJ3BsYXllcl9vbmUnID8gdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkIDogdGhpcy5nYW1lLnBsYXllclR3b0JvYXJkO1xuICAgICAgdGhpcy5kcm9wU3Vic2NyaWJlciA9IGBkcm9wJHtwbGF5ZXIuc3Vic3RyaW5nKHBsYXllci5pbmRleE9mKCdfJykpfWA7XG4gICAgICB0aGlzLnJvdGF0ZVN1YnNjcmliZXIgPSBgcm90YXRlJHtwbGF5ZXIuc3Vic3RyaW5nKHBsYXllci5pbmRleE9mKCdfJykpfWA7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLnBvcnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5wb3J0cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBvcnRfc2hpcCcpO1xuICAgICAgdGhpcy5zaGlwcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNoaXBfYm94Jyk7XG4gICAgICB0aGlzLnJlc2V0QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVzZXRfYnRuJyk7XG4gICAgICB0aGlzLnJlYWR5QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVhZHlfYnRuJyk7XG4gICAgfSxcbiAgICBiaW5kRXZlbnRzKCkge1xuICAgICAgdGhpcy5zaGlwcy5mb3JFYWNoKChzaGlwKSA9PiB7XG4gICAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQwNDY0NjkwL3dhbnQtdG8tcGVyZm9ybS1kaWZmZXJlbnQtdGFzay1vbi1tb3VzZWRvd24tYW5kLWNsaWNrLWV2ZW50XG4gICAgICAgIHNoaXAuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5kcmFnU3RhcnRIYW5kbGVyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyB0aGlzLnJlYWR5RXZlbnQgPSBuZXcgRXZlbnQoJ2NsaWNrJyk7XG4gICAgICB0aGlzLnJlc2V0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5yZXNldEhhbmRsZXIpO1xuICAgICAgdGhpcy5yZWFkeUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucmVhZHlIYW5kbGVyKTtcbiAgICAgIHB1YlN1Yi5zdWJzY3JpYmUodGhpcy5kcm9wU3Vic2NyaWJlciwgdGhpcy5kcm9wSGFuZGxlcik7XG4gICAgICBwdWJTdWIuc3Vic2NyaWJlKHRoaXMucm90YXRlU3Vic2NyaWJlciwgdGhpcy5yb3RhdGVIYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IHBsYXllclBvcnQgPSBjcmVhdGVFbGVtZW50KHBvcnRDb25maWcuZWxlbWVudCk7XG4gICAgICBwbGF5ZXJQb3J0LnNldEF0dHJpYnV0ZXMocG9ydENvbmZpZy5hdHRyaWJ1dGVzKTtcbiAgICAgIHBsYXllclBvcnQuc2V0Q2hpbGRyZW4ocG9ydENvbmZpZy5jaGlsZHJlbik7XG4gICAgICB0aGlzLmNhY2hlRE9NKHBsYXllclBvcnQpO1xuICAgICAgaWYgKCF0aGlzLm1vZGUpIHRoaXMucmVhZHlCdG4uY2xhc3NMaXN0LmFkZCgnaW5hY3RpdmUnKTtcbiAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xuICAgICAgcmV0dXJuIHBsYXllclBvcnQ7XG4gICAgfSxcbiAgICBkcmFnU3RhcnRIYW5kbGVyKGUpIHtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlID0gZS5jdXJyZW50VGFyZ2V0O1xuICAgICAgdGhpcy5kcmFnU3RhcnQgPSBlLnRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgICAgdGhpcy5kcm9wUGxhY2Vob2xkZXIgPSB0aGlzLmRyYWdnYWJsZS5jbG9uZU5vZGUoKTtcbiAgICAgIHRoaXMuZHJvcFBsYWNlaG9sZGVyLmNsYXNzTGlzdC5hZGQoJ3NoaXBfYm94X3BsYWNlaG9sZGVyJyk7XG4gICAgICB0aGlzLm9mZlNldFggPSBlLmNsaWVudFg7XG4gICAgICB0aGlzLm9mZlNldFkgPSBlLmNsaWVudFk7XG5cbiAgICAgIHRoaXMuZHJhZ1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuZHJhZ01vdmVIYW5kbGVyKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucm90YXRlSGFuZGxlcik7XG4gICAgICB9LCAyNTApO1xuXG4gICAgICB0aGlzLmRyYWdnYWJsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucm90YXRlSGFuZGxlciwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH0sXG4gICAgZHJhZ01vdmVIYW5kbGVyKGUpIHtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5hZGQoJ2RyYWdnaW5nJyk7XG4gICAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QuYWRkKCdkcmFnc3RhcnQnKTtcblxuICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAke2UuY2xpZW50WCAtIHRoaXMub2ZmU2V0WH1weGA7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgJHtlLmNsaWVudFkgLSB0aGlzLm9mZlNldFl9cHhgO1xuXG4gICAgICBjb25zdCB7IGxlZnQsIHRvcCwgd2lkdGggfSA9IHRoaXMuZHJhZ2dhYmxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3Qgc2hpcExlbmd0aCA9IHBhcnNlSW50KHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQubGVuZ3RoKTtcbiAgICAgIGNvbnN0IG9mZlNldCA9ICh3aWR0aCAvIHNoaXBMZW5ndGgpICogMC41O1xuXG4gICAgICBjb25zdCBjZWxsID0gZG9jdW1lbnRcbiAgICAgICAgLmVsZW1lbnRzRnJvbVBvaW50KGxlZnQgKyBvZmZTZXQsIHRvcCArIG9mZlNldClcbiAgICAgICAgLmZpbmQoKGVsZW1lbnQpID0+IGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjZWxsJykpO1xuXG4gICAgICBjb25zdCBib2FyZCA9IGRvY3VtZW50XG4gICAgICAgIC5lbGVtZW50c0Zyb21Qb2ludChsZWZ0ICsgb2ZmU2V0LCB0b3AgKyBvZmZTZXQpXG4gICAgICAgIC5maW5kKChlbGVtZW50KSA9PiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnYm9hcmQnKSk7XG4gICAgICBjb25zdCBpc1BsYXllclNoaXAgPSBib2FyZCA/IGJvYXJkLnBhcmVudEVsZW1lbnQuY29udGFpbnModGhpcy5wb3J0KSA6IGZhbHNlO1xuICAgICAgaWYgKGNlbGwgJiYgaXNQbGF5ZXJTaGlwKSB7XG4gICAgICAgIC8vIERyYWdnaW5nIG92ZXIgZHJvcCB6b25lXG4gICAgICAgIC8vIElmIGRyYWdnYWJsZSBpcyBtb3JlIHRoYW4gNTAlIG92ZXIgaXQncyAnbGFzdCcgY2VsbFxuICAgICAgICAvLyAgQXBwZW5kIHRoZSBkcmFnZ2FibGUgdG8gdGhlIGNlbGwgY29udGVudCBjb250YWluZXJcbiAgICAgICAgdGhpcy5jZWxsID0gY2VsbDtcbiAgICAgICAgY29uc3QgeCA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LngpO1xuICAgICAgICBjb25zdCB5ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueSk7XG5cbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQub3JpZW50YXRpb24gIT09ICdoJztcbiAgICAgICAgLy8gdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCB0cnVlLCBmYWxzZSwgaWQpO1xuICAgICAgICB0aGlzLnBsYXllckJvYXJkLnBsYWNlU2hpcChcbiAgICAgICAgICBbeCwgeV0sXG4gICAgICAgICAgc2hpcExlbmd0aCxcbiAgICAgICAgICBvcmllbnRhdGlvbixcbiAgICAgICAgICB0cnVlLFxuICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgIGlkLFxuICAgICAgICAgIHRoaXMuZHJvcFN1YnNjcmliZXIsXG4gICAgICAgICAgdGhpcy5yb3RhdGVTdWJzY3JpYmVyLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRHJhZ2dpbmcgb3ZlciBhIG5vbiBkcm9wIHpvbmVcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5jb250YWlucygnc2hpcF9ib3hfdHJhbnNwYXJlbnQnKSAmJlxuICAgICAgICAgIHRoaXMuY2VsbC5maXJzdENoaWxkLmxhc3RDaGlsZFxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLmNlbGwuZmlyc3RDaGlsZC5sYXN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5jZWxsID0gbnVsbDtcbiAgICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QucmVtb3ZlKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkcmFnRW5kSGFuZGxlcihlKSB7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5sZWZ0ID0gYDBweGA7XG4gICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS50b3AgPSBgMHB4YDtcblxuICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZ2dpbmcnKTtcbiAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICB0aGlzLmRyYWdTdGFydC5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnc3RhcnQnKTtcblxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5kcmFnTW92ZUhhbmRsZXIpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuZHJhZ0VuZEhhbmRsZXIpO1xuICAgICAgaWYgKHRoaXMuY2VsbCkge1xuICAgICAgICAvLyBJZiB1c2VyIGhhcyBzdG9wcGVkIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh0aGlzLmNlbGwuZGF0YXNldC55KTtcbiAgICAgICAgY29uc3Qgc2hpcExlbmd0aCA9IHBhcnNlSW50KHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHRoaXMuZHJhZ2dhYmxlLmRhdGFzZXQub3JpZW50YXRpb24gIT09ICdoJztcbiAgICAgICAgLy8gdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLnBsYWNlU2hpcChbeCwgeV0sIHNoaXBMZW5ndGgsIG9yaWVudGF0aW9uLCBmYWxzZSwgZmFsc2UsIGlkKTtcbiAgICAgICAgdGhpcy5wbGF5ZXJCb2FyZC5wbGFjZVNoaXAoXG4gICAgICAgICAgW3gsIHldLFxuICAgICAgICAgIHNoaXBMZW5ndGgsXG4gICAgICAgICAgb3JpZW50YXRpb24sXG4gICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgaWQsXG4gICAgICAgICAgdGhpcy5kcm9wU3Vic2NyaWJlcixcbiAgICAgICAgICB0aGlzLnJvdGF0ZVN1YnNjcmliZXIsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5kcmFnU3RhcnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdwb3J0X3NoaXAnKSAmJiB0aGlzLmRyYWdnYWJsZSkge1xuICAgICAgICAvLyBJZiBkcmFnU3RhcnQgaXMgbm90IHRoZSBwb3J0X3NoaXAgZWxlbWVudFxuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5sZWZ0ID0gYC00JWA7XG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAtNCVgO1xuICAgICAgfVxuICAgIH0sXG4gICAgZHJvcEhhbmRsZXIoaXNEcmFnZ2luZywgaXNWYWxpZERyb3ApIHtcbiAgICAgIGlmICh0aGlzLmNlbGwpIHtcbiAgICAgICAgY29uc3QgY2VsbENvbnRlbnQgPSB0aGlzLmNlbGwuZmlyc3RDaGlsZDtcbiAgICAgICAgaWYgKGlzRHJhZ2dpbmcgJiYgaXNWYWxpZERyb3ApIHtcbiAgICAgICAgICAvLyBJZiB1c2VyIGlzIGRyYWdnaW5nIG92ZXIgdGhlIGRyb3Agem9uZVxuICAgICAgICAgIGNlbGxDb250ZW50LmFwcGVuZENoaWxkKHRoaXMuZHJvcFBsYWNlaG9sZGVyKTtcbiAgICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QuYWRkKCdzaGlwX2JveF90cmFuc3BhcmVudCcpO1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0RyYWdnaW5nICYmIGlzVmFsaWREcm9wKSB7XG4gICAgICAgICAgLy8gSWYgdXNlciBoYXMgc3RvcHBlZCBkcmFnZ2luZyBvdmVyIHRoZSBkcm9wIHpvbmVcbiAgICAgICAgICBjZWxsQ29udGVudC5hcHBlbmRDaGlsZCh0aGlzLmRyYWdnYWJsZSk7XG4gICAgICAgICAgdGhpcy5kcm9wUGxhY2Vob2xkZXIucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUubGVmdCA9IGAtNCVgO1xuICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLnN0eWxlLnRvcCA9IGAtNCVgO1xuICAgICAgICAgIGlmICh0aGlzLnJlc2V0QnRuLmNsYXNzTGlzdC5jb250YWlucygnaW5hY3RpdmUnKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpbmFjdGl2ZScpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0aGlzLmlzUG9ydHNFbXB0eSgpICYmICF0aGlzLmdhbWVSZWFkeSkge1xuICAgICAgICAgICAgdGhpcy5nYW1lUmVhZHkgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5yZWFkeUJ0bi5jbGljaygpO1xuICAgICAgICAgICAgaWYgKHRoaXMubW9kZSkgdGhpcy5yZWFkeUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpbmFjdGl2ZScpO1xuICAgICAgICAgICAgWy4uLnRoaXMucG9ydC5jaGlsZHJlbl0uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFjaGlsZC5jbGFzc0xpc3QuY29udGFpbnMoJ2J0bnNfY29udGFpbmVyJykpIHtcbiAgICAgICAgICAgICAgICBjaGlsZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEcmFnZ2luZyAmJiAhaXNWYWxpZERyb3ApIHtcbiAgICAgICAgICAvLyBJZiB1c2VyIGlzIGRyYWdnaW5nIG92ZXIgYW4gaW52YWxpZCBkcm9wXG4gICAgICAgICAgaWYgKHRoaXMuZHJvcFBsYWNlaG9sZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRyb3BQbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dhYmxlLmNsYXNzTGlzdC5yZW1vdmUoJ3NoaXBfYm94X3RyYW5zcGFyZW50Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICByb3RhdGVIYW5kbGVyKGUpIHtcbiAgICAgIGNvbnN0IG5ld09yaWVudGF0aW9uID0gdGhpcy5kcmFnZ2FibGUuZGF0YXNldC5vcmllbnRhdGlvbiA9PT0gJ2gnO1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNb3VzZUV2ZW50KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRyYWdUaW1lcik7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAhdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkcmFnZ2luZycpICYmXG4gICAgICAgICAgIXRoaXMuZHJhZ1N0YXJ0LmNsYXNzTGlzdC5jb250YWlucygncG9ydF9zaGlwJylcbiAgICAgICAgKSB7XG4gICAgICAgICAgLy8gSWYgc2hpcCBpcyBub3QgYmVpbmcgZHJhZ2dlZCBhbmQgaXQgaXMgbm90IGluIHBvcnRcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5jZWxsID0gdGhpcy5kcmFnU3RhcnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICBjb25zdCB4ID0gcGFyc2VJbnQodGhpcy5jZWxsLmRhdGFzZXQueCk7XG4gICAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHRoaXMuY2VsbC5kYXRhc2V0LnkpO1xuICAgICAgICAgIGNvbnN0IHNoaXBMZW5ndGggPSBwYXJzZUludCh0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lmxlbmd0aCk7XG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0LmlkO1xuICAgICAgICAgIC8vIHRoaXMuZ2FtZS5wbGF5ZXJPbmVCb2FyZC5wbGFjZVNoaXAoW3gsIHldLCBzaGlwTGVuZ3RoLCBuZXdPcmllbnRhdGlvbiwgZmFsc2UsIHRydWUsIGlkKTtcbiAgICAgICAgICB0aGlzLnBsYXllckJvYXJkLnBsYWNlU2hpcChcbiAgICAgICAgICAgIFt4LCB5XSxcbiAgICAgICAgICAgIHNoaXBMZW5ndGgsXG4gICAgICAgICAgICBuZXdPcmllbnRhdGlvbixcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgdGhpcy5kcm9wU3Vic2NyaWJlcixcbiAgICAgICAgICAgIHRoaXMucm90YXRlU3Vic2NyaWJlcixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICB9IGVsc2UgaWYgKGUgPT09IHRydWUgJiYgcGFyc2VJbnQodGhpcy5kcmFnZ2FibGUuZGF0YXNldC5sZW5ndGgpID4gMSkge1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5kYXRhc2V0Lm9yaWVudGF0aW9uID0gbmV3T3JpZW50YXRpb24gPyAndicgOiAnaCc7XG4gICAgICAgIGNvbnN0IG5ld1dpZHRoID0gbmV3T3JpZW50YXRpb24gPyB0aGlzLmRyYWdnYWJsZS5zdHlsZS53aWR0aCA6IHRoaXMuZHJhZ2dhYmxlLnN0eWxlLmhlaWdodDtcbiAgICAgICAgY29uc3QgbmV3SGVpZ2h0ID0gbmV3T3JpZW50YXRpb24gPyB0aGlzLmRyYWdnYWJsZS5zdHlsZS5oZWlnaHQgOiB0aGlzLmRyYWdnYWJsZS5zdHlsZS53aWR0aDtcbiAgICAgICAgdGhpcy5kcmFnZ2FibGUuc3R5bGUud2lkdGggPSBuZXdPcmllbnRhdGlvbiA/IG5ld0hlaWdodCA6IG5ld1dpZHRoO1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5zdHlsZS5oZWlnaHQgPSBuZXdPcmllbnRhdGlvbiA/IG5ld1dpZHRoIDogbmV3SGVpZ2h0O1xuICAgICAgfSBlbHNlIGlmIChlID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLmRyYWdnYWJsZS5jbGFzc0xpc3QuYWRkKCdyb3RhdGVfZXJyb3InKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5kcmFnZ2FibGUuY2xhc3NMaXN0LnJlbW92ZSgncm90YXRlX2Vycm9yJyk7XG4gICAgICAgIH0sIDI1MCk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZXNldEhhbmRsZXIoZSkge1xuICAgICAgLy8gQ2xlYXJzIGJvYXJkXG4gICAgICB0aGlzLmdhbWVSZWFkeSA9IGZhbHNlO1xuICAgICAgY29uc3QgcGxheWVyQm9hcmQgPSB0aGlzLnJlc2V0QnRuLmNsb3Nlc3QoXG4gICAgICAgIHRoaXMucmVzZXRCdG4uY2xvc2VzdCgnLnBsYXllcl9vbmUnKSA/ICcucGxheWVyX29uZScgOiAnLnBsYXllcl90d28nLFxuICAgICAgKS5maXJzdENoaWxkO1xuXG4gICAgICB0aGlzLnBsYXllckJvYXJkLmNsZWFyQm9hcmQoKTtcbiAgICAgIHRoaXMucG9ydC5yZXBsYWNlV2l0aCh0aGlzLnJlbmRlcigpKTtcbiAgICAgIHBsYXllckJvYXJkLnJlcGxhY2VXaXRoKGJvYXJkKHRoaXMucGxheWVyQm9hcmQuYm9hcmQpKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdwbGF5ZXJSZWFkeScsIHRoaXMucGxheWVyKTtcbiAgICB9LFxuICAgIGlzUG9ydHNFbXB0eSgpIHtcbiAgICAgIHJldHVybiBbLi4udGhpcy5wb3J0c10uZXZlcnkoKHBvcnQpID0+IHBvcnQuZmlyc3RDaGlsZCA9PT0gbnVsbCk7XG4gICAgfSxcbiAgICByZWFkeUhhbmRsZXIoZSkge1xuICAgICAgY29uc3QgaXNSZWFkeSA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LnJlYWR5ICE9PSAndHJ1ZSc7XG4gICAgICBlLmN1cnJlbnRUYXJnZXQudGV4dENvbnRlbnQgPSBpc1JlYWR5ID8gJ1VucmVhZHknIDogJ1JlYWR5JztcbiAgICAgIGUuY3VycmVudFRhcmdldC5kYXRhc2V0LnJlYWR5ID0gaXNSZWFkeTtcbiAgICAgIGlmICh0aGlzLm1vZGUpIHRoaXMuaGlkZVNoaXBzKGlzUmVhZHkpO1xuICAgICAgcHViU3ViLnB1Ymxpc2goJ3BsYXllclJlYWR5JywgdGhpcy5wbGF5ZXIsIGlzUmVhZHkpO1xuICAgIH0sXG4gICAgaGlkZVNoaXBzKGlzUmVhZHkpIHtcbiAgICAgIHRoaXMuc2hpcHMuZm9yRWFjaCgoc2hpcCkgPT4ge1xuICAgICAgICBjb25zdCBkaXNwbGF5ID0gaXNSZWFkeSA/ICdub25lJyA6ICdibG9jayc7XG4gICAgICAgIHNoaXAuc3R5bGUuZGlzcGxheSA9IGRpc3BsYXk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9O1xuXG4gIHBvcnQuaW5pdCgpO1xuICByZXR1cm4gcG9ydC5yZW5kZXIoKTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAoc3RhdGUpID0+ICh7XG4gIHBsYXllcnNSZWFkeTogW10sXG4gIGluaXQoKSB7XG4gICAgY29uc29sZS5sb2coJ2luaXQgcnVubmluZyBmcm9tIGNvbXBvc2VHYW1lJyk7XG4gIH0sXG4gIGlzR2FtZVJlYWR5KHBsYXllciwgaXNSZWFkeSkge1xuICAgIGlmICh0aGlzLm1vZGUpIHtcbiAgICAgIC8vIElmIGh1bWFuIHZzIGh1bWFuXG4gICAgICBjb25zdCBpbmRleCA9IHRoaXMucGxheWVyc1JlYWR5LmluZGV4T2YocGxheWVyKTtcbiAgICAgIGlmIChwbGF5ZXIgJiYgaXNSZWFkeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChpc1JlYWR5KSB7XG4gICAgICAgICAgdGhpcy5wbGF5ZXJzUmVhZHkucHVzaChwbGF5ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucGxheWVyc1JlYWR5LnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICB0aGlzLnBsYXllcnNSZWFkeS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5wbGF5ZXJzUmVhZHkubGVuZ3RoID09PSAyICYmIHRoaXMucGxheUJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ2luYWN0aXZlJykpIHtcbiAgICAgICAgdGhpcy5wbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2luYWN0aXZlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaW5hY3RpdmUnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5jb250YWlucygnaW5hY3RpdmUnKSkge1xuICAgICAgICB0aGlzLnBsYXllclR3b0NvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdpbmFjdGl2ZScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnaW5hY3RpdmUnKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHBsYXkoZSkge1xuICAgIGlmICghdGhpcy5tb2RlKSB7XG4gICAgICB0aGlzLmdhbWUucGxheWVyVHdvLmJvYXJkLnBsYWNlU2hpcHNSYW5kb20oKTtcbiAgICB9XG4gICAgdGhpcy5nYW1lUmVhZHkgPSB0cnVlO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gICAgdGhpcy5yZW5kZXJXYWl0KCk7XG4gIH0sXG59KTtcbiIsImltcG9ydCBwdWJTdWIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9wdWJTdWInO1xuXG5leHBvcnQgZGVmYXVsdCAoc3RhdGUpID0+ICh7XG4gIGluaXQoKSB7fSxcbiAgdW5iaW5kRXZlbnRzKCkge1xuICAgIHRoaXMucGxheWVyT25lQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgdGhpcy5wbGF5ZXJUd29Cb2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgfSxcbiAgZ2V0QnV0dG9uKFt4LCB5XSkge1xuICAgIC8vIEZpbmQgYnV0dG9uIG9uIHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIncyBib2FyZFxuICAgIC8vIGZvciB3aGljaCBpdCdzIGRhdGFzZXQueCA9PT0geCBhbmQgZGF0YXNldC55ID09PSB5XG4gICAgY29uc3QgYm9hcmQgPSBbXG4gICAgICAuLi4odGhpcy5nYW1lLmFjdGl2ZVBsYXllciA9PT0gdGhpcy5nYW1lLnBsYXllck9uZVxuICAgICAgICA/IHRoaXMucGxheWVyVHdvQm9hcmRcbiAgICAgICAgOiB0aGlzLnBsYXllck9uZUJvYXJkXG4gICAgICApLmNoaWxkcmVuLFxuICAgIF0uZmxhdE1hcCgocm93KSA9PiBbLi4ucm93LmNoaWxkcmVuXSk7XG4gICAgcmV0dXJuIGJvYXJkLmZpbmQoKGJ0bikgPT4gYnRuLmRhdGFzZXQueCA9PSB4ICYmIGJ0bi5kYXRhc2V0LnkgPT0geSk7XG4gIH0sXG4gIHJlbmRlckF0dGFjayhjZWxsLCBjb29yZGluYXRlcykge1xuICAgIGNvbnNvbGUubG9nKGNvb3JkaW5hdGVzKTtcbiAgICBjb25zdCBpc0FycmF5ID0gY29vcmRpbmF0ZXMuZXZlcnkoKGl0ZW0pID0+IEFycmF5LmlzQXJyYXkoaXRlbSkpO1xuICAgIGlmIChpc0FycmF5KSB7XG4gICAgICBjb29yZGluYXRlcy5mb3JFYWNoKChjb29yZGluYXRlKSA9PiB7XG4gICAgICAgIGNvbnN0IGJ1dHRvbiA9IHRoaXMuZ2V0QnV0dG9uKGNvb3JkaW5hdGUpO1xuICAgICAgICBjb25zb2xlLmxvZyhidXR0b24pO1xuICAgICAgICBidXR0b24uY2xhc3NMaXN0LmFkZCgnZG9uZScpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IHRoaXMuZ2V0QnV0dG9uKGNvb3JkaW5hdGVzKTtcbiAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKGNlbGwubWlzcyA/ICdtaXNzJyA6ICdoaXQnKTtcbiAgICB9XG4gICAgLy8gY29uc3QgYnV0dG9uID0gdGhpcy5nZXRCdXR0b24oY29vcmRpbmF0ZXMpO1xuICAgIC8vIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKGNlbGwubWlzcyA/ICdtaXNzJyA6ICdoaXQnKTtcbiAgfSxcbiAgcmVuZGVyV2FpdCgpIHtcbiAgICBsZXQgbm90aWZpY2F0aW9uTWVzc2FnZSA9IGBQbGF5ZXIgb25lJ3MgdHVybi5gO1xuICAgIGlmICh0aGlzLmdhbWUuYWN0aXZlUGxheWVyID09PSB0aGlzLmdhbWUucGxheWVyT25lKSB7XG4gICAgICAvLyBJZiBnYW1lLmFjdGl2ZVBsYXllciBpcyBOT1QgcGxheWVyT25lXG4gICAgICAvLyBQdXQgJ3dhaXQnIGNsYXNzIG9uIHRoZSBwbGF5ZXIgb25lJ3MgY29udGFpbmVyXG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBZb3VyIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgT3Bwb25lbnQncyBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBPcHBvbmVudCdzIGdyaWRgO1xuICAgICAgdGhpcy5wbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgWW91ciBncmlkYDtcbiAgICAgIHRoaXMucGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ3dhaXQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lQm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmJvYXJkSGFuZGxlcik7XG4gICAgICB0aGlzLnBsYXllclR3b0JvYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgICAgbm90aWZpY2F0aW9uTWVzc2FnZSA9IGBQbGF5ZXIgdHdvJ3MgdHVybi5gO1xuICAgIH1cblxuICAgIHB1YlN1Yi5wdWJsaXNoKCdub3RpZnknLCBub3RpZmljYXRpb25NZXNzYWdlKTtcblxuICAgIGlmICghdGhpcy5tb2RlICYmIHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIgPT09IHRoaXMuZ2FtZS5wbGF5ZXJUd28pIHtcbiAgICAgIC8vIE9wdGlvbmFsLCBwdXQgYSBzZXRUaW1lb3V0KClcbiAgICAgIHRoaXMuZ2FtZS5wbGF5Um91bmQoKTtcbiAgICB9XG4gIH0sXG4gIGVuZEdhbWUobWVzc2FnZSkge1xuICAgIHRoaXMudW5iaW5kRXZlbnRzKCk7XG4gICAgcHViU3ViLnB1Ymxpc2goJ25vdGlmeScsIG1lc3NhZ2UpO1xuICB9LFxuICBib2FyZEhhbmRsZXIoZSkge1xuICAgIGNvbnN0IGJ0biA9IGUudGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3QgeCA9IHBhcnNlSW50KGJ0bi5kYXRhc2V0LngpO1xuICAgIGNvbnN0IHkgPSBwYXJzZUludChidG4uZGF0YXNldC55KTtcbiAgICBpZiAoIWlzTmFOKHgpIHx8ICFpc05hTih5KSkge1xuICAgICAgY29uc3QgY2VsbCA9IHRoaXMuZ2FtZS5hY3RpdmVQbGF5ZXIub3Bwb25lbnRCb2FyZC5nZXRCb2FyZENlbGwoW3gsIHldKTtcbiAgICAgIGlmIChjZWxsLm1pc3MgPT09IGZhbHNlIHx8IGNlbGwuaGl0ID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLmdhbWUucGxheVJvdW5kKFt4LCB5XSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxufSk7XG4iLCJpbXBvcnQgR2FtZUNvbnRyb2xsZXIgZnJvbSAnLi4vLi4vY29udGFpbmVycy9nYW1lQ29udHJvbGxlcic7XG5pbXBvcnQgY3JlYXRlRWxlbWVudCBmcm9tICcuLi8uLi9oZWxwZXJzL2NyZWF0ZUVsZW1lbnQnO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuLi8uLi9jb250YWluZXJzL3B1YlN1Yic7XG5pbXBvcnQgY29tcG9zZUdhbWUgZnJvbSAnLi9jb21wb3NlR2FtZSc7XG5pbXBvcnQgcGxheUdhbWUgZnJvbSAnLi9wbGF5R2FtZSc7XG5pbXBvcnQgcG9ydCBmcm9tICcuLi9wb3J0L3BvcnQnO1xuaW1wb3J0IGJvYXJkIGZyb20gJy4uL2JvYXJkL2JvYXJkJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL3NjcmVlbkNvbnRyb2xsZXIuY3NzJztcbmltcG9ydCAnLi4vLi4vc3R5bGVzL3BvcnQuY3NzJztcblxuLy8gVHJ5aW5nIHRvIGRlY2lkZSB3aGV0aGVyIG9yIG5vdCBpdCBpcyBhIGdvb2QgaWRlYSB0byBjcmVhdGUgYSBzZXBhcmF0ZSBtb2R1bGVcbi8vIHRvIGNvbnRyb2wgdGhlIHNjcmVlbiBhZnRlciBwbGF5ZXJzIGhhdmUgcGxhY2VkIGFsbCB0aGVpciBzaGlwc1xuLy8gYW5kIGFmdGVyIGEgJ3N0YXJ0JyBidXR0b24gaXMgY2xpY2tlZFxuZXhwb3J0IGRlZmF1bHQgKG1vZGUpID0+IHtcbiAgLy8gQnVpbGRzIGVtcHR5IGJvYXJkIGZvciBwbGF5ZXJzIHRvIHBsYWNlIHRoZWlyIHNoaXBzXG4gIC8vIG1vZGUgPT09IHRydWUgPT4gaHVtYW4gdnMgaHVtYW5cbiAgLy8gbW9kZSA9PT0gZmFsc2UgPT4gaHVtYW4gdnMgY29tcHV0ZXJcblxuICBjb25zdCBzY3JlZW5Db250cm9sbGVyID0ge1xuICAgIG1vZGUsXG4gICAgZ2FtZVJlYWR5OiBmYWxzZSxcbiAgICBnYW1lOiBHYW1lQ29udHJvbGxlcihtb2RlKSxcbiAgICBpbml0KCkge1xuICAgICAgdGhpcy5ib2FyZHMgPSB7XG4gICAgICAgIHBsYXllck9uZTogdGhpcy5nYW1lLnBsYXllck9uZUJvYXJkLmJvYXJkLFxuICAgICAgICBwbGF5ZXJUd286IHRoaXMuZ2FtZS5wbGF5ZXJUd29Cb2FyZC5ib2FyZCxcbiAgICAgIH07XG4gICAgICBwdWJTdWIucHVibGlzaCgnbm90aWZ5JywgJ1BsYWNlIHNoaXBzJyk7XG4gICAgICB0aGlzLnVwZGF0ZUdhbWVTdGF0ZShjb21wb3NlR2FtZSk7XG4gICAgICB0aGlzLnBsYXkgPSB0aGlzLnBsYXkuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuaXNHYW1lUmVhZHkgPSB0aGlzLmlzR2FtZVJlYWR5LmJpbmQodGhpcyk7XG4gICAgfSxcbiAgICB1cGRhdGVHYW1lU3RhdGUoY2FsbGJhY2spIHtcbiAgICAgIE9iamVjdC5hc3NpZ24odGhpcywgY2FsbGJhY2soKSk7XG4gICAgfSxcbiAgICBjYWNoZURPTShlbGVtZW50KSB7XG4gICAgICB0aGlzLmdhbWVDb250YWluZXIgPSBlbGVtZW50O1xuICAgICAgdGhpcy5ib2FyZENvbnRhaW5lciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignI2JvYXJkc19jb250YWluZXInKTtcbiAgICAgIHRoaXMucGxheWVyT25lQ29udGFpbmVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZScpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Db250YWluZXIgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5ZXJfdHdvJyk7XG4gICAgICB0aGlzLnBsYXllck9uZUJvYXJkID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZSA+IC5ib2FyZCcpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Cb2FyZCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl90d28gPiAuYm9hcmQnKTtcbiAgICAgIHRoaXMucGxheWVyT25lSGVhZGVyID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWVyX29uZSA+IGg0Jyk7XG4gICAgICB0aGlzLnBsYXllclR3b0hlYWRlciA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXllcl90d28gPiBoNCcpO1xuICAgICAgdGhpcy5wbGF5QnRuID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucGxheV9idG4nKTtcbiAgICB9LFxuICAgIGJpbmRFdmVudHMoKSB7XG4gICAgICBpZiAoIXRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIC8vIGlmICghdGhpcy5tb2RlKSB7XG4gICAgICAgIHRoaXMucGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucGxheSk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3BsYXllclJlYWR5JywgdGhpcy5pc0dhbWVSZWFkeSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZ2FtZVJlYWR5KSB7XG4gICAgICAgIHRoaXMudXBkYXRlR2FtZVN0YXRlKHBsYXlHYW1lKTtcbiAgICAgICAgdGhpcy5yZW5kZXJBdHRhY2sgPSB0aGlzLnJlbmRlckF0dGFjay5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmVuZEdhbWUgPSB0aGlzLmVuZEdhbWUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJXYWl0ID0gdGhpcy5yZW5kZXJXYWl0LmJpbmQodGhpcyk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3JlbmRlckF0dGFjaycsIHRoaXMucmVuZGVyQXR0YWNrKTtcbiAgICAgICAgcHViU3ViLnN1YnNjcmliZSgnZW5kR2FtZScsIHRoaXMuZW5kR2FtZSk7XG4gICAgICAgIHB1YlN1Yi5zdWJzY3JpYmUoJ3JlbmRlcldhaXQnLCB0aGlzLnJlbmRlcldhaXQpO1xuICAgICAgICB0aGlzLmJvYXJkSGFuZGxlciA9IHRoaXMuYm9hcmRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgICB9XG4gICAgICB0aGlzLnBsYXllck9uZUJvYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5ib2FyZEhhbmRsZXIpO1xuICAgICAgdGhpcy5wbGF5ZXJUd29Cb2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYm9hcmRIYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IGdhbWVDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdzZWN0aW9uJyk7XG4gICAgICBjb25zdCBib2FyZHNDb250YWluZXIgPSBjcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGNvbnN0IHBsYXllck9uZUNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgY29uc3QgcGxheWVyVHdvQ29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBwbGF5ZXJPbmVIZWFkZXIgPSBjcmVhdGVFbGVtZW50KCdoNCcpO1xuICAgICAgY29uc3QgcGxheWVyVHdvSGVhZGVyID0gY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgICAgIGNvbnN0IGdhbWVQbGF5Q29udGFpbmVyID0gY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBjb25zdCBnYW1lUGxheUJ0biA9IGNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgY29uc3QgZ2FtZVBsYXlCdG5UZXh0ID0gY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgZ2FtZVBsYXlCdG5UZXh0LnRleHRDb250ZW50ID0gJ1BsYXknO1xuICAgICAgZ2FtZUNvbnRhaW5lci5pZCA9ICdnYW1lX2NvbnRhaW5lcic7XG4gICAgICBib2FyZHNDb250YWluZXIuaWQgPSAnYm9hcmRzX2NvbnRhaW5lcic7XG4gICAgICBwbGF5ZXJPbmVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgncGxheWVyX29uZScpO1xuICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3BsYXllcl90d28nKTtcbiAgICAgIHBsYXllck9uZUhlYWRlci50ZXh0Q29udGVudCA9IGBQbGF5ZXIgb25lJ3MgZ3JpZGA7XG4gICAgICBwbGF5ZXJUd29IZWFkZXIudGV4dENvbnRlbnQgPSBgUGxheWVyIHR3bydzIGdyaWRgO1xuICAgICAgZ2FtZVBsYXlDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZ2FtZV9wbGF5Jyk7XG4gICAgICBnYW1lUGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdwbGF5X2J0bicpO1xuICAgICAgLy8gUmVuZGVycyBwbGF5ZXJzJyBib2FyZHNcbiAgICAgIHBsYXllck9uZUNvbnRhaW5lci5hcHBlbmRDaGlsZChib2FyZCh0aGlzLmJvYXJkcy5wbGF5ZXJPbmUpKTtcbiAgICAgIHBsYXllclR3b0NvbnRhaW5lci5hcHBlbmRDaGlsZChib2FyZCh0aGlzLmJvYXJkcy5wbGF5ZXJUd28pKTtcbiAgICAgIHBsYXllck9uZUNvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJPbmVIZWFkZXIpO1xuICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKHBsYXllclR3b0hlYWRlcik7XG4gICAgICBib2FyZHNDb250YWluZXIuYXBwZW5kQ2hpbGQocGxheWVyT25lQ29udGFpbmVyKTtcbiAgICAgIGJvYXJkc0NvbnRhaW5lci5hcHBlbmRDaGlsZChwbGF5ZXJUd29Db250YWluZXIpO1xuICAgICAgZ2FtZVBsYXlCdG4uYXBwZW5kQ2hpbGQoZ2FtZVBsYXlCdG5UZXh0KTtcbiAgICAgIGdhbWVQbGF5Q29udGFpbmVyLmFwcGVuZENoaWxkKGdhbWVQbGF5QnRuKTtcbiAgICAgIGlmICghdGhpcy5nYW1lUmVhZHkpIHtcbiAgICAgICAgcGxheWVyT25lQ29udGFpbmVyLmFwcGVuZENoaWxkKHBvcnQoJ3BsYXllcl9vbmUnLCB0aGlzLmdhbWUsIHRoaXMubW9kZSkpO1xuICAgICAgICBpZiAodGhpcy5tb2RlKSB7XG4gICAgICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmFwcGVuZENoaWxkKHBvcnQoJ3BsYXllcl90d28nLCB0aGlzLmdhbWUsIHRoaXMubW9kZSkpO1xuICAgICAgICAgIGdhbWVQbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2luYWN0aXZlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2luYWN0aXZlJyk7XG4gICAgICAgICAgcGxheWVyVHdvQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dhaXQnKTtcbiAgICAgICAgfVxuICAgICAgICBwbGF5ZXJUd29Db250YWluZXIuYXBwZW5kQ2hpbGQoZ2FtZVBsYXlDb250YWluZXIpO1xuICAgICAgfVxuXG4gICAgICBnYW1lQ29udGFpbmVyLmFwcGVuZENoaWxkKGJvYXJkc0NvbnRhaW5lcik7XG4gICAgICBpZiAodGhpcy5nYW1lUmVhZHkpIHRoaXMuZ2FtZUNvbnRhaW5lci5yZXBsYWNlV2l0aChnYW1lQ29udGFpbmVyKTtcbiAgICAgIHRoaXMuY2FjaGVET00oZ2FtZUNvbnRhaW5lcik7XG4gICAgICB0aGlzLmJpbmRFdmVudHMoKTtcbiAgICAgIGlmICghdGhpcy5nYW1lUmVhZHkpIHJldHVybiBnYW1lQ29udGFpbmVyO1xuICAgICAgLy8gRG9lcyBoYXZpbmcgdGhpcyBpZiBzdGF0ZW1lbnQgbWF0dGVyP1xuICAgIH0sXG4gIH07XG4gIHNjcmVlbkNvbnRyb2xsZXIuaW5pdCgpO1xuICByZXR1cm4gc2NyZWVuQ29udHJvbGxlci5yZW5kZXIoKTtcbn07XG4iLCJpbXBvcnQgR2FtZWJvYXJkIGZyb20gJy4vZ2FtZWJvYXJkJztcbmltcG9ydCBQbGF5ZXIgZnJvbSAnLi9wbGF5ZXInO1xuaW1wb3J0IHBpcGUgZnJvbSAnLi9waXBlJztcbmltcG9ydCBpc0h1bWFuIGZyb20gJy4vaXNIdW1hbic7XG5pbXBvcnQgaXNDb21wdXRlciBmcm9tICcuL2lzQ29tcHV0ZXInO1xuaW1wb3J0IHB1YlN1YiBmcm9tICcuL3B1YlN1Yic7XG4vLyBNb2R1bGUgdGhhdCBjb250cm9scyB0aGUgbWFpbiBnYW1lIGxvb3Bcbi8vIEZvciBub3cganVzdCBwb3B1bGF0ZSBlYWNoIEdhbWVib2FyZCB3aXRoIHByZWRldGVybWluZWQgY29vcmRpbmF0ZXMuXG4vLyBZb3UgYXJlIGdvaW5nIHRvIGltcGxlbWVudCBhIHN5c3RlbSBmb3IgYWxsb3dpbmcgcGxheWVycyB0byBwbGFjZSB0aGVpciBzaGlwcyBsYXRlci5cbmV4cG9ydCBkZWZhdWx0IChtb2RlKSA9PiB7XG4gIC8vIElmIG1vZGUgaXMgdHJ1ZSBwbGF5ZXIgdHdvIHdpbGwgYmUgYSBodW1hbiwgZWxzZSBhIGNvbXB1dGVyXG4gIC8vIFRoZSBnYW1lIGxvb3Agc2hvdWxkIHNldCB1cCBhIG5ldyBnYW1lIGJ5IGNyZWF0aW5nIFBsYXllcnMgYW5kIEdhbWVib2FyZHMuXG4gIC8vIDEuIENyZWF0ZSBnYW1lYm9hcmRzXG4gIC8vIDIuIENyZWF0ZSBwbGF5ZXJzIGFuZCBwYXNzIGluIHRoZWlyIGdhbWVib2FyZCBhbmQgdGhlIG9wcG9uZW50J3MgZ2FtZWJvYXJkLlxuICAvLyAgRG8gSSBvbmx5IG5lZWQgdG8gcGFzcyB0aGUgb3Bwb25lbnQncyBib2FyZD9cbiAgLy8gbGV0IGFjdGl2ZVBsYXllcjtcbiAgY29uc3QgcGxheWVyT25lQm9hcmQgPSBHYW1lYm9hcmQoKTtcbiAgY29uc3QgcGxheWVyVHdvQm9hcmQgPSBHYW1lYm9hcmQoKTtcblxuICBjb25zdCBwbGF5ZXJPbmUgPSBwaXBlKFBsYXllciwgaXNIdW1hbikocGxheWVyT25lQm9hcmQsIHBsYXllclR3b0JvYXJkKTtcbiAgY29uc3QgcGxheWVyVHdvID0gcGlwZShQbGF5ZXIsIG1vZGUgPyBpc0h1bWFuIDogaXNDb21wdXRlcikocGxheWVyVHdvQm9hcmQsIHBsYXllck9uZUJvYXJkKTtcblxuICBjb25zdCBwbGF5ZXJzID0gW3BsYXllck9uZSwgcGxheWVyVHdvXTtcbiAgbGV0IGFjdGl2ZVBsYXllciA9IHBsYXllcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMildO1xuXG4gIGNvbnN0IHN3aXRjaFBsYXllcnMgPSAocGxheWVyKSA9PiB7XG4gICAgaWYgKHBsYXllcikge1xuICAgICAgLy8gTG9va2luZyBpbnRvIExvZGFzaCBfLmlzRXF1YWwoKVxuICAgICAgLy8gQ291bGQgYWRkIGEgdHVybiBwcm9wZXJ0eSB0byBwbGF5ZXIgb2JqZWN0IHRoYXQgdGFrZXMgYSBib29sZWFuXG4gICAgICBhY3RpdmVQbGF5ZXIgPSBwbGF5ZXIgPT09IHBsYXllck9uZSA/IHBsYXllclR3byA6IHBsYXllck9uZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgcGxheVJvdW5kID0gKGNvb3JkaW5hdGUpID0+IHtcbiAgICAvLyBBbGxvdyBhIHBsYXllciB0byBhdHRhY2sgYWdhaW4gaWYgdGhlIGluaXRpYWwgYXR0YWNrIGhpdHMgYSBzaGlwXG4gICAgYWN0aXZlUGxheWVyLmF0dGFjayhjb29yZGluYXRlKTtcblxuICAgIGNvbnN0IHN0YXR1cyA9IGdldEdhbWVTdGF0dXMoKTtcbiAgICBpZiAoIXN0YXR1cy5zdGF0dXMpIHtcbiAgICAgIC8vIElmIGdhbWUgaXMgbm90IG92ZXIsIHN3aXRjaCBwbGF5ZXJzXG4gICAgICBzd2l0Y2hQbGF5ZXJzKGFjdGl2ZVBsYXllcik7XG4gICAgICBwdWJTdWIucHVibGlzaCgncmVuZGVyV2FpdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwdWJTdWIucHVibGlzaCgnZW5kR2FtZScsIHN0YXR1cy5tZXNzYWdlKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZ2V0R2FtZVN0YXR1cyA9ICgpID0+IHtcbiAgICBjb25zdCBzdGF0dXMgPSB7IHN0YXR1czogcGxheWVyT25lQm9hcmQuZ2V0U3RhdHVzKCkgfHwgcGxheWVyVHdvQm9hcmQuZ2V0U3RhdHVzKCkgfTtcbiAgICBpZiAoc3RhdHVzLnN0YXR1cykge1xuICAgICAgLy8gR2FtZSBpcyBvdmVyXG4gICAgICBjb25zdCBtZXNzYWdlID0gcGxheWVyT25lQm9hcmQuZ2V0U3RhdHVzKCkgPyAnUGxheWVyIHR3byB3b24hJyA6ICdQbGF5ZXIgb25lIHdvbiEnO1xuICAgICAgT2JqZWN0LmFzc2lnbihzdGF0dXMsIHsgbWVzc2FnZSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXR1cztcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHN3aXRjaFBsYXllcnMsXG4gICAgcGxheVJvdW5kLFxuICAgIGdldEdhbWVTdGF0dXMsXG4gICAgZ2V0IGFjdGl2ZVBsYXllcigpIHtcbiAgICAgIHJldHVybiBhY3RpdmVQbGF5ZXI7XG4gICAgfSxcbiAgICBnZXQgcGxheWVyT25lKCkge1xuICAgICAgcmV0dXJuIHBsYXllck9uZTtcbiAgICB9LFxuICAgIGdldCBwbGF5ZXJUd28oKSB7XG4gICAgICByZXR1cm4gcGxheWVyVHdvO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllck9uZUJvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllck9uZUJvYXJkO1xuICAgIH0sXG4gICAgZ2V0IHBsYXllclR3b0JvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllclR3b0JvYXJkO1xuICAgIH0sXG4gIH07XG59O1xuIiwiaW1wb3J0IFNoaXAgZnJvbSAnLi4vY29udGFpbmVycy9zaGlwJztcbmltcG9ydCBwdWJTdWIgZnJvbSAnLi9wdWJTdWInO1xuaW1wb3J0IGdlbmVyYXRlVVVJRCBmcm9tICcuLi9oZWxwZXJzL2dlbmVyYXRlVVVJRCc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgLy8gS2VlcCB0cmFjayBvZiBtaXNzZWQgYXR0YWNrcyBzbyB0aGV5IGNhbiBkaXNwbGF5IHRoZW0gcHJvcGVybHkuXG4gIC8vIEJlIGFibGUgdG8gcmVwb3J0IHdoZXRoZXIgb3Igbm90IGFsbCBvZiB0aGVpciBzaGlwcyBoYXZlIGJlZW4gc3Vuay5cbiAgLy8gVGhlIG1lbW8gYXJyYXkgc3RvcmVzIGEgQ2VsbCdzIHJlZmVyZW5jZXMgdGhhdCByZXNlbWJsZSB3aGVyZSBzaGlwcyBoYXZlIGJlZW4gcGxhY2VkLlxuICAvLyBUaGUgbWVtbyBhcnJheSBpcyB1c2VkIGluIHRoZSBtZXRob2RzIGNsZWFyQm9hcmQgYW5kIHBsYWNlU2hpcFxuICBjb25zdCBtZW1vID0gW107XG4gIGNvbnN0IENlbGwgPSAoc2hpcCkgPT4ge1xuICAgIHJldHVybiBzaGlwXG4gICAgICA/IHtcbiAgICAgICAgICBzaGlwLFxuICAgICAgICAgIGhpdDogZmFsc2UsXG4gICAgICAgICAgYXR0YWNrKCkge1xuICAgICAgICAgICAgdGhpcy5oaXQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zaGlwLmhpdCgpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIDoge1xuICAgICAgICAgIG1pc3M6IGZhbHNlLFxuICAgICAgICAgIGF0dGFjaygpIHtcbiAgICAgICAgICAgIHRoaXMubWlzcyA9IHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgfTtcbiAgY29uc3QgYm9hcmQgPSBuZXcgQXJyYXkoMTApLmZpbGwoKS5tYXAoKCkgPT4gbmV3IEFycmF5KDEwKS5maWxsKCkubWFwKCgpID0+IENlbGwoKSkpO1xuXG4gIGNvbnN0IGNsZWFyQm9hcmQgPSAoKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW1vLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBjb25zdCB7IHJvdywgY29sIH0gPSBtZW1vW2ldO1xuICAgICAgYm9hcmRbcm93XVtjb2xdID0gQ2VsbCgpO1xuICAgICAgbWVtby5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHBhcnNlQ29vcmRpbmF0ZSA9IChbeCwgeV0pID0+IHtcbiAgICAvLyBQYXJzZXMgY29vcmRpbmF0ZSBpbnB1dHRlZCBieSB1c2VyIHN1Y2ggdGhhdFxuICAgIC8vIHRoZSB2YWx1ZSBwYWlycyBjYW4gYmUgdXNlZCBmb3IgYWNjZXNzaW5nIGVsZW1lbnRzXG4gICAgLy8gaW4gdGhlIHR3byBkaW1lbnNpb25hbCBhcnJheVxuICAgIHJldHVybiBbYm9hcmQubGVuZ3RoIC0geSwgeCAtIDFdO1xuICB9O1xuXG4gIGNvbnN0IHVucGFyc2VDb29yZGluYXRlID0gKFt4LCB5XSkgPT4ge1xuICAgIHJldHVybiBbeSArIDEsIGJvYXJkLmxlbmd0aCAtIHhdO1xuICB9O1xuXG4gIGNvbnN0IGdlbmVyYXRlUmFuZG9tQ29vcmRpbmF0ZSA9ICgpID0+IHtcbiAgICAvLyBSZXR1cm5zIHJhbmRvbSBjb29yZGluYXRlIHdpdGggdmFsdWVzIGJldHdlZW4gMSBhbmQgMTBcbiAgICBjb25zdCBjb29yZGluYXRlID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyOyBpICs9IDEpIHtcbiAgICAgIGNvb3JkaW5hdGUucHVzaChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCArIDEpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvb3JkaW5hdGU7XG4gIH07XG5cbiAgY29uc3QgZ2VuZXJhdGVTaGlwQ29vcmRpbmF0ZXMgPSAoW3gsIHldLCBvcmllbnRhdGlvbiwgc2hpcExlbmd0aCkgPT4ge1xuICAgIGNvbnN0IGNvb3JkaW5hdGVzID0gW107XG5cbiAgICBpZiAob3JpZW50YXRpb24pIHtcbiAgICAgIC8vIFZlcnRpY2FsXG4gICAgICBmb3IgKGxldCBpID0geDsgaSA8IHggKyBzaGlwTGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29vcmRpbmF0ZXMucHVzaChbaSwgeV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIb3Jpem9udGFsXG4gICAgICBmb3IgKGxldCBpID0geTsgaSA8IHkgKyBzaGlwTGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29vcmRpbmF0ZXMucHVzaChbeCwgaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb29yZGluYXRlcztcbiAgfTtcblxuICBjb25zdCB2YWxpZGF0ZUNvb3JkaW5hdGUgPSAoeCwgeSkgPT4ge1xuICAgIHJldHVybiB4ID49IDAgJiYgeCA8IDEwICYmIHkgPj0gMCAmJiB5IDwgMTA7XG4gIH07XG5cbiAgY29uc3QgY2hlY2tCb2FyZCA9IChbeCwgeV0sIGlkKSA9PiB7XG4gICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgYSBzaGlwIGF0IHggYW5kIHlcbiAgICAvLyBDaGVjayBpZiBhbGwgc3Vycm91bmRpbmcgY29vcmRpbmF0ZXMgYXJlIHVuZGVmaW5lZFxuICAgIC8vIFJldHVybiB0cnVlIGlmIHNoaXAgY2FuIGJlIHBsYWNlXG4gICAgY29uc3QgYm9vbGVhbiA9IHZhbGlkYXRlQ29vcmRpbmF0ZSh4LCB5KTtcbiAgICBjb25zdCBjaGVjayA9IFtcbiAgICAgIFt4LCB5XSxcbiAgICAgIFt4LCB5ICsgMV0sXG4gICAgICBbeCwgeSAtIDFdLFxuICAgICAgW3ggKyAxLCB5XSxcbiAgICAgIFt4ICsgMSwgeSArIDFdLFxuICAgICAgW3ggKyAxLCB5IC0gMV0sXG4gICAgICBbeCAtIDEsIHldLFxuICAgICAgW3ggLSAxLCB5ICsgMV0sXG4gICAgICBbeCAtIDEsIHkgLSAxXSxcbiAgICBdO1xuICAgIHJldHVybiBjaGVjay5ldmVyeSgoW2EsIGJdKSA9PiB7XG4gICAgICAvLyBOZWVkIHRvIGNoZWNrIGlmIGEgYW5kIGIgYXJlIHdpdGhpbiB0aGUgYm9hcmQncyBzaXplXG4gICAgICAvLyBUaGUgdmFsdWUgb2YgYSBhbmQgYiBjYW4gb25seSBiZSBiZXR3ZWVuIGZyb20gMCB0byA5LlxuICAgICAgLy8gSXQgaXMgcG9pbnRsZXNzIHRvIGNoZWNrIGlmIHRoZXJlIGlzIHNwYWNlIHdoZW4gYSBzaGlwIGlzIHBsYWNlZCBhdCB0aGUgYm9yZGVyIG9mIHRoZSBib2FyZFxuICAgICAgcmV0dXJuIHZhbGlkYXRlQ29vcmRpbmF0ZShhLCBiKVxuICAgICAgICA/IGJvb2xlYW4gJiYgKGJvYXJkW2FdW2JdLnNoaXAgPT09IHVuZGVmaW5lZCB8fCBib2FyZFthXVtiXS5zaGlwLmlkID09PSBpZClcbiAgICAgICAgOiBib29sZWFuO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IHBsYWNlU2hpcCA9IChcbiAgICBjb29yZGluYXRlcyxcbiAgICBzaGlwTGVuZ3RoLFxuICAgIG9yaWVudGF0aW9uLFxuICAgIGlzRHJhZ2dpbmcsXG4gICAgaXNSb3RhdGluZyxcbiAgICBpZCxcbiAgICBkcm9wU3Vic2NyaWJlcixcbiAgICByb3RhdGVTdWJzY3JpYmVyLFxuICApID0+IHtcbiAgICAvLyBIb3cgbWFueSBwYXJhbWV0ZXJzIGlzIHRvbyBtdWNoP1xuXG4gICAgY29uc3QgW3gsIHldID0gcGFyc2VDb29yZGluYXRlKGNvb3JkaW5hdGVzKTtcbiAgICBjb25zdCBzaGlwQ29vcmRpbmF0ZXMgPSBnZW5lcmF0ZVNoaXBDb29yZGluYXRlcyhbeCwgeV0sIG9yaWVudGF0aW9uLCBzaGlwTGVuZ3RoKTtcbiAgICBjb25zdCBpc1ZhbGlkQ29vcmRpbmF0ZXMgPSBzaGlwQ29vcmRpbmF0ZXMuZXZlcnkoKGNvb3JkaW5hdGUpID0+IHtcbiAgICAgIHJldHVybiBjaGVja0JvYXJkKGNvb3JkaW5hdGUsIGlkKTtcbiAgICB9KTtcblxuICAgIGlmIChpc1ZhbGlkQ29vcmRpbmF0ZXMgJiYgIWlzRHJhZ2dpbmcpIHtcbiAgICAgIGNvbnN0IG5ld1NoaXAgPSBTaGlwKHNoaXBMZW5ndGgsIGlkKTtcbiAgICAgIC8vIENoZWNrIGlmIHggYW5kIHkgYXJlIHdpdGhpbiB0aGUgYm9hcmQncyBzaXplXG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIHNoaXAgYXQgeCBhbmQgeVxuXG4gICAgICBjb25zdCBpc1NoaXBPbkJvYXJkID0gbWVtby5zb21lKChjZWxsKSA9PiBjZWxsLmlkID09PSBpZCAmJiBpZCAhPT0gdW5kZWZpbmVkKTtcbiAgICAgIGlmIChpc1NoaXBPbkJvYXJkKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWVtby5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGlmIChtZW1vW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgICAgY29uc3QgeyByb3csIGNvbCB9ID0gbWVtb1tpXTtcbiAgICAgICAgICAgIGJvYXJkW3Jvd11bY29sXSA9IENlbGwoKTtcbiAgICAgICAgICAgIG1lbW8uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAob3JpZW50YXRpb24pIHtcbiAgICAgICAgLy8gVmVydGljYWxcbiAgICAgICAgZm9yIChsZXQgaSA9IHg7IGkgPCB4ICsgbmV3U2hpcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGJvYXJkW2ldW3ldID0gQ2VsbChuZXdTaGlwKTtcbiAgICAgICAgICBtZW1vLnB1c2goeyByb3c6IGksIGNvbDogeSwgaWQgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEhvcml6b250YWxcbiAgICAgICAgZm9yIChsZXQgaSA9IHk7IGkgPCB5ICsgbmV3U2hpcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIGJvYXJkW3hdW2ldID0gQ2VsbChuZXdTaGlwKTtcbiAgICAgICAgICBtZW1vLnB1c2goeyByb3c6IHgsIGNvbDogaSwgaWQgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGlzUm90YXRpbmcpIHtcbiAgICAgICAgcHViU3ViLnB1Ymxpc2gocm90YXRlU3Vic2NyaWJlciwgdHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwdWJTdWIucHVibGlzaChkcm9wU3Vic2NyaWJlciwgZmFsc2UsIHRydWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWYWxpZENvb3JkaW5hdGVzICYmIGlzRHJhZ2dpbmcgJiYgIWlzUm90YXRpbmcpIHtcbiAgICAgIC8vIERyYWdnYWJsZSBzdGlsbCBkcmFnZ2luZyBhbmQgdmFsaWQgcGxhY2VtZW50XG4gICAgICBwdWJTdWIucHVibGlzaChkcm9wU3Vic2NyaWJlciwgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmICghaXNWYWxpZENvb3JkaW5hdGVzICYmIGlzRHJhZ2dpbmcgJiYgIWlzUm90YXRpbmcpIHtcbiAgICAgIC8vIERyYWdnYWJsZSBzdGlsbCBkcmFnZ2luZyBhbmQgaW52YWxpZCBwbGFjZW1lbnRcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKGRyb3BTdWJzY3JpYmVyLCB0cnVlLCBmYWxzZSk7XG4gICAgfSBlbHNlIGlmICghaXNWYWxpZENvb3JkaW5hdGVzICYmICFpc0RyYWdnaW5nICYmIGlzUm90YXRpbmcpIHtcbiAgICAgIC8vIERyYWdnYWJsZSBpcyBub3QgZHJhZ2dpbmcsIGludmFsaWQgcGxhY2VtZW50LCBhbmQgZmFpbHMgdG8gcm90YXRlXG4gICAgICBwdWJTdWIucHVibGlzaChyb3RhdGVTdWJzY3JpYmVyLCBmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHBsYWNlU2hpcHNSYW5kb20gPSAoKSA9PiB7XG4gICAgY29uc3Qgc2hpcHMgPSBbNCwgMywgMywgMiwgMiwgMiwgMSwgMSwgMSwgMV07XG4gICAgY29uc3QgY29vcmRpbmF0ZXMgPSBbXTtcbiAgICBsZXQgaSA9IDA7XG5cbiAgICB3aGlsZSAoaSA8IHNoaXBzLmxlbmd0aCkge1xuICAgICAgY29uc3QgW3gsIHldID0gZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4gICAgICBjb25zdCBbcGFyc2VkWCwgcGFyc2VkWV0gPSBwYXJzZUNvb3JkaW5hdGUoW3gsIHldKTtcbiAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMikgPT09IDE7XG4gICAgICBjb25zdCBzaGlwTGVuZ3RoID0gc2hpcHNbaV07XG4gICAgICBjb25zdCBzaGlwQ29vcmRpbmF0ZXMgPSBnZW5lcmF0ZVNoaXBDb29yZGluYXRlcyhbcGFyc2VkWCwgcGFyc2VkWV0sIG9yaWVudGF0aW9uLCBzaGlwTGVuZ3RoKTtcbiAgICAgIGNvbnN0IGlzVmFsaWRDb29yZGluYXRlID0gc2hpcENvb3JkaW5hdGVzLmV2ZXJ5KGNoZWNrQm9hcmQpO1xuICAgICAgaWYgKCFjb29yZGluYXRlcy5maW5kKChbYSwgYl0pID0+IGEgPT09IHggJiYgYiA9PT0geSkgJiYgaXNWYWxpZENvb3JkaW5hdGUpIHtcbiAgICAgICAgcGxhY2VTaGlwKFt4LCB5XSwgc2hpcExlbmd0aCwgb3JpZW50YXRpb24sIGZhbHNlLCBmYWxzZSwgZ2VuZXJhdGVVVUlEKCkpO1xuICAgICAgICBjb29yZGluYXRlcy5wdXNoKFt4LCB5XSk7XG4gICAgICAgIGkgKz0gMTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgY29uc3Qgc2hvdHMgPSBbXTtcbiAgY29uc3QgdmFsaWRhdGVBdHRhY2sgPSAoeCwgeSkgPT4ge1xuICAgIC8vIENoZWNrcyBpZiBjb29yZGluYXRlIGlzIHdpdGggdGhlIGJvYXJkIHNpemUgYW5kIGhhcyBub3QgYmVlbiBhdHRhY2tlZFxuICAgIGNvbnN0IFthLCBiXSA9IHBhcnNlQ29vcmRpbmF0ZShbeCwgeV0pO1xuICAgIHJldHVybiAhc2hvdHMuZmluZCgoW2EsIGJdKSA9PiBhID09PSB4ICYmIGIgPT09IHkpICYmIHZhbGlkYXRlQ29vcmRpbmF0ZShhLCBiKTtcbiAgfTtcblxuICBjb25zdCByZWNlaXZlQXR0YWNrID0gKFt4LCB5XSkgPT4ge1xuICAgIC8vIEhhdmUgYSByZWNlaXZlQXR0YWNrIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBwYWlyIG9mIGNvb3JkaW5hdGVzXG4gICAgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgYXR0YWNrIGhpdCBhIHNoaXBcbiAgICAvLyBUaGVuIHNlbmRzIHRoZSDigJhoaXTigJkgZnVuY3Rpb24gdG8gdGhlIGNvcnJlY3Qgc2hpcCwgb3IgcmVjb3JkcyB0aGUgY29vcmRpbmF0ZXMgb2YgdGhlIG1pc3NlZCBzaG90LlxuICAgIGNvbnN0IGNlbGwgPSBnZXRCb2FyZENlbGwoW3gsIHldKTtcbiAgICBjb25zdCBpc1ZhbGlkQXR0YWNrID0gdmFsaWRhdGVBdHRhY2soeCwgeSk7XG5cbiAgICBpZiAoaXNWYWxpZEF0dGFjaykge1xuICAgICAgY2VsbC5hdHRhY2soKTtcbiAgICAgIHNob3RzLnB1c2goW3gsIHldKTtcbiAgICAgIHB1YlN1Yi5wdWJsaXNoKCdyZW5kZXJBdHRhY2snLCBjZWxsLCBbeCwgeV0pO1xuICAgICAgY29uc3Qgc2hpcCA9IGNlbGwuc2hpcDtcbiAgICAgIGlmIChzaGlwICYmIHNoaXAuaXNTdW5rKCkpIHtcbiAgICAgICAgLy8gTmVlZCB0byBmaW5kIGFsbCBjb29yZGluYXRlcyBmb3IgdGhlIHNoaXBcbiAgICAgICAgLy8gY29uc3Qgc2hpcENvb3JkaW5hdGVzID0gbWVtby5maWx0ZXIoKHNoaXBNZW1vKSA9PiBzaGlwTWVtby5pZCA9PT0gc2hpcC5pZCk7XG4gICAgICAgIGNvbnN0IHNoaXBDb29yZGluYXRlcyA9IG1lbW8ucmVkdWNlKChhY2N1bXVsYXRvciwgY3VycmVudCkgPT4ge1xuICAgICAgICAgIGlmIChjdXJyZW50LmlkID09PSBzaGlwLmlkKSB7XG4gICAgICAgICAgICBhY2N1bXVsYXRvci5wdXNoKHVucGFyc2VDb29yZGluYXRlKFtjdXJyZW50LnJvdywgY3VycmVudC5jb2xdKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBwdWJTdWIucHVibGlzaCgncmVuZGVyQXR0YWNrJywgY2VsbCwgc2hpcENvb3JkaW5hdGVzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZ2V0U3RhdHVzID0gKCkgPT4ge1xuICAgIC8vIFJlcG9ydHMgd2hldGhlciBvciBub3QgYWxsIG9mIHRoZWlyIHNoaXBzIGhhdmUgYmVlbiBzdW5rLlxuICAgIGNvbnN0IGZsYXRCb2FyZCA9IGJvYXJkLmZsYXQoKS5maWx0ZXIoKGNlbGwpID0+IGNlbGwuc2hpcCAhPT0gdW5kZWZpbmVkKTtcbiAgICByZXR1cm4gZmxhdEJvYXJkLmV2ZXJ5KChjZWxsKSA9PiBjZWxsLnNoaXAuaXNTdW5rKCkpO1xuICB9O1xuXG4gIGNvbnN0IGdldEJvYXJkQ2VsbCA9IChbeCwgeV0pID0+IHtcbiAgICBjb25zdCBbYSwgYl0gPSBwYXJzZUNvb3JkaW5hdGUoW3gsIHldKTtcbiAgICByZXR1cm4gYm9hcmRbYV1bYl07XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICByZWNlaXZlQXR0YWNrLFxuICAgIHBsYWNlU2hpcCxcbiAgICBwbGFjZVNoaXBzUmFuZG9tLFxuICAgIGdldFN0YXR1cyxcbiAgICBnZXRCb2FyZENlbGwsXG4gICAgY2xlYXJCb2FyZCxcbiAgICBnZXQgYm9hcmQoKSB7XG4gICAgICByZXR1cm4gYm9hcmQ7XG4gICAgfSxcbiAgfTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAocGxheWVyKSA9PiB7XG4gIC8vIE1ha2UgdGhlIOKAmGNvbXB1dGVy4oCZIGNhcGFibGUgb2YgbWFraW5nIHJhbmRvbSBwbGF5cy5cbiAgLy8gVGhlIEFJIGRvZXMgbm90IGhhdmUgdG8gYmUgc21hcnQsXG4gIC8vIEJ1dCBpdCBzaG91bGQga25vdyB3aGV0aGVyIG9yIG5vdCBhIGdpdmVuIG1vdmUgaXMgbGVnYWxcbiAgLy8gKGkuZS4gaXQgc2hvdWxkbuKAmXQgc2hvb3QgdGhlIHNhbWUgY29vcmRpbmF0ZSB0d2ljZSkuXG5cbiAgY29uc3Qgc2hvdHMgPSBbXTtcbiAgY29uc3QgZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlID0gKCkgPT4ge1xuICAgIC8vIFJldHVybnMgcmFuZG9tIGNvb3JkaW5hdGUgd2l0aCB2YWx1ZXMgYmV0d2VlbiAxIGFuZCAxMFxuICAgIGNvbnN0IGNvb3JkaW5hdGUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDI7IGkgKz0gMSkge1xuICAgICAgY29vcmRpbmF0ZS5wdXNoKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwICsgMSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29vcmRpbmF0ZTtcbiAgfTtcblxuICBjb25zdCBhdHRhY2sgPSAoKSA9PiB7XG4gICAgLy8gUmV0dXJucyBhIHJhbmRvbSB1bmlxdWUgY29vcmRpbmF0ZSB0aGF0IGlzIGluLWJvdW5kcyBvZiB0aGUgYm9hcmRcbiAgICAvLyBOb3RlLCBpZiBzaG90cy5sZW5ndGggaXMgMTAwLCBnYW1lIHdpbGwgYmUgb3ZlclxuICAgIC8vIFRoZXJlIGFyZSBvbmx5IDEwMCBjb29yZGluYXRlcyB0byBhdHRhY2tcbiAgICB3aGlsZSAoc2hvdHMubGVuZ3RoIDwgMTAwKSB7XG4gICAgICBsZXQgW3gsIHldID0gZ2VuZXJhdGVSYW5kb21Db29yZGluYXRlKCk7XG4gICAgICBpZiAoIXNob3RzLmZpbmQoKFthLCBiXSkgPT4gYSA9PT0geCAmJiBiID09PSB5KSkge1xuICAgICAgICBwbGF5ZXIub3Bwb25lbnRCb2FyZC5yZWNlaXZlQXR0YWNrKFt4LCB5XSk7XG4gICAgICAgIHNob3RzLnB1c2goW3gsIHldKTtcbiAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHsgYXR0YWNrIH07XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgKHBsYXllcikgPT4gKHtcbiAgYXR0YWNrOiAoW3gsIHldKSA9PiB7XG4gICAgcGxheWVyLm9wcG9uZW50Qm9hcmQucmVjZWl2ZUF0dGFjayhbeCwgeV0pO1xuICAgIHJldHVybiBbeCwgeV07XG4gIH0sXG59KTtcbiIsIi8vIEFydGljbGVzIGFib3V0IGxvb3NlbHkgY291cGxpbmcgb2JqZWN0IGluaGVyaXRhbmNlIHdpdGggZmFjdG9yeSBmdW5jdGlvbnMgYW5kIHBpcGVcbi8vIGh0dHBzOi8vbWVkaXVtLmNvbS9kYWlseWpzL2J1aWxkaW5nLWFuZC1jb21wb3NpbmctZmFjdG9yeS1mdW5jdGlvbnMtNTBmZTkwMTQxMzc0XG4vLyBodHRwczovL3d3dy5mcmVlY29kZWNhbXAub3JnL25ld3MvcGlwZS1hbmQtY29tcG9zZS1pbi1qYXZhc2NyaXB0LTViMDQwMDRhYzkzNy9cbi8vIE9ic2VydmF0aW9uOiBpZiB0aGVyZSBpcyBubyBpbml0aWFsIHZhbHVlLCB0aGUgZmlyc3QgZnVuY3Rpb24gZG9lcyBub3QgcnVuXG5leHBvcnQgZGVmYXVsdCAoaW5pdGlhbEZuLCAuLi5mbnMpID0+XG4gICguLi52YWx1ZXMpID0+IHtcbiAgICByZXR1cm4gZm5zLnJlZHVjZSgob2JqLCBmbikgPT4ge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqLCBmbihvYmopKTtcbiAgICB9LCBpbml0aWFsRm4odmFsdWVzKSk7XG4gIH07XG4iLCIvLyBQbGF5ZXJzIGNhbiB0YWtlIHR1cm5zIHBsYXlpbmcgdGhlIGdhbWUgYnkgYXR0YWNraW5nIHRoZSBlbmVteSBHYW1lYm9hcmQuXG4vLyBUaGUgZ2FtZSBpcyBwbGF5ZWQgYWdhaW5zdCB0aGUgY29tcHV0ZXIsXG5cbi8vIERvZXMgZWFjaCBwbGF5ZXIgaGF2ZSB0aGVpciBvd24gZ2FtZWJvYXJkP1xuLy8gRG9lcyBlYWNoIHBsYXllciBoYXZlIGFjY2VzcyB0byB0aGUgb3Bwb25lbnQncyBnYW1lYm9hcmQ/XG4vLyBIb3cgdG8gZGVjaWRlIGlmIGdhbWUgaXMgcGxheWVyIHZzIHBsYXllciBhbmQgcGxheWVyIHZzIGNvbXB1dGVyP1xuZXhwb3J0IGRlZmF1bHQgKFtwbGF5ZXJCb2FyZCwgb3Bwb25lbnRCb2FyZF0pID0+IHtcbiAgLy8gY29uc3QgYm9hcmQgPSBwbGF5ZXJCb2FyZDtcbiAgLy8gRG8gSSBuZWVkIHRvIGRlY2xhcmUgdGhlIGNvbnN0IHZhcmlhYmxlP1xuICBjb25zdCBzdGF0ZSA9IHtcbiAgICBnZXQgb3Bwb25lbnRCb2FyZCgpIHtcbiAgICAgIHJldHVybiBvcHBvbmVudEJvYXJkO1xuICAgIH0sXG4gICAgZ2V0IGJvYXJkKCkge1xuICAgICAgcmV0dXJuIHBsYXllckJvYXJkO1xuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIHN0YXRlO1xufTtcblxuLypcbmNvbnN0IHBpcGUgPSAoaW5pdGlhbEZuLCAuLi5mbnMpID0+IHtcbiAgcmV0dXJuIGZucy5yZWR1Y2UoKG9iaiwgZm4pID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIGZuKG9iaikpO1xuICB9LCBpbml0aWFsRm4oKSk7XG59O1xuXG5jb25zdCBBbmltYWwgPSAoKSA9PiB7XG4gIGxldCB3ZWlnaHQ7XG5cbiAgY29uc3Qgc3RhdGUgPSB7XG4gICAgd2VpZ2h0LFxuICAgIGluZm86ICgpID0+ICh7XG4gICAgICB3ZWlnaHQ6IHN0YXRlLndlaWdodCxcbiAgICAgIGxlZ3M6IHN0YXRlLmxlZ3MsXG4gICAgfSksXG4gIH07XG4gIHJldHVybiBzdGF0ZTtcbn07XG5cbmNvbnN0IENhdCA9IChzdGF0ZSkgPT4gKHtcbiAgdHlwZTogJ2NhdCcsXG4gIGxlZ3M6IDQsXG4gIHNwZWFrOiAoKSA9PiBgbWVvdywgSSBoYXZlICR7c3RhdGUubGVnc30gbGVnc2AsXG4gIHBvb3A6ICgpID0+IGBtZW93Li4uSSBhbSBwb29waW5nLmAsXG4gIHBvb3BBZ2FpbjogKCkgPT4gYCR7c3RhdGUucG9vcCgpfSBtZW93IG1lb3cuLi5JIGFtIHBvb3Bpbmcgb25jZSBtb3JlYCxcbn0pO1xuXG5jb25zdCBCaXJkID0gKHN0YXRlKSA9PiAoe1xuICB0eXBlOiAnYmlyZCcsXG4gIGxlZ3M6IDIsXG4gIHNwZWFrOiAoKSA9PiBgY2hpcnAuLi5jaGlycCwgSSBoYXZlICR7c3RhdGUubGVnc30gbGVnc2AsXG4gIHBvb3A6ICgpID0+IGBjaGlycC4uLkkgYW0gcG9vcGluZy5gLFxuICBwb29wQWdhaW46ICgpID0+IGAke3N0YXRlLnBvb3AoKX0gY2hpcnAgY2hpcnAuLi5JIGFtIHBvb3Bpbmcgb25jZSBtb3JlYCxcbn0pO1xuXG5jb25zdCBXaXphcmQgPSAoc3RhdGUpID0+ICh7XG4gIGZpcmViYWxsOiAoKSA9PiBgJHtzdGF0ZS50eXBlfSBpcyBjYXN0aW5nIGZpcmViYWxsYCxcbn0pO1xuXG5jb25zdCBOZWNyb21hbmNlciA9IChzdGF0ZSkgPT4gKHtcbiAgZGVmaWxlRGVhZDogKCkgPT4gYCR7c3RhdGUudHlwZX0gaXMgY2FzdGluZyBkZWZpbGUgZGVhZGAsXG59KTtcblxuY29uc3QgY2F0ID0gcGlwZShBbmltYWwsIENhdCwgV2l6YXJkKTtcbmNvbnN0IGJpcmQgPSBwaXBlKEFuaW1hbCwgQmlyZCwgTmVjcm9tYW5jZXIpO1xuY29uc29sZS5sb2coY2F0LmZpcmViYWxsKCkpO1xuY29uc29sZS5sb2coY2F0LnNwZWFrKCkpO1xuY29uc29sZS5sb2coY2F0LmluZm8oKSk7XG5jYXQud2VpZ2h0ID0gMTA7XG5jb25zb2xlLmxvZyhjYXQuaW5mbygpKTtcbmNvbnNvbGUubG9nKGJpcmQuZGVmaWxlRGVhZCgpKTtcbmNvbnNvbGUubG9nKGJpcmQuc3BlYWsoKSk7XG5jb25zb2xlLmxvZyhiaXJkLmluZm8oKSk7XG5iaXJkLndlaWdodCA9IDM7XG5jb25zb2xlLmxvZyhiaXJkLmluZm8oKSk7XG4qL1xuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBzdWJzY3JpYmVyczoge30sXG4gIHN1YnNjcmliZShzdWJzY3JpYmVyLCBmbikge1xuICAgIC8vIFdoZW4gd291bGQgeW91IHdhbnQgdG8gc3Vic2NyaWJlIGEgc2luZ2xlIGZ1bmN0aW9uIGluIHRoZSBzYW1lIHN1YnNjcmliZXIgbW9yZSB0aGFuIG9uY2U/XG4gICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXSA9IHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0gfHwgW107XG4gICAgaWYgKCF0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmZpbmQoKGhhbmRsZXIpID0+IGhhbmRsZXIubmFtZSA9PT0gZm4ubmFtZSkpIHtcbiAgICAgIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl0ucHVzaChmbik7XG4gICAgfVxuICB9LFxuICB1bnN1YnNjcmliZShzdWJzY3JpYmVyLCBmbikge1xuICAgIGlmICh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLnNwbGljZSh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmluZGV4T2YoZm4pLCAxKTtcbiAgICAgIGlmICh0aGlzLnN1YnNjcmliZXJzW3N1YnNjcmliZXJdLmxlbmd0aCA9PT0gMCkgZGVsZXRlIHRoaXMuc3Vic2NyaWJlcnNbc3Vic2NyaWJlcl07XG4gICAgfVxuICB9LFxuICBwdWJsaXNoKHN1YnNjcmliZXIsIC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXSkge1xuICAgICAgdGhpcy5zdWJzY3JpYmVyc1tzdWJzY3JpYmVyXS5mb3JFYWNoKChmbikgPT4gZm4oLi4uYXJncykpO1xuICAgIH1cbiAgfSxcbn07XG4iLCJleHBvcnQgZGVmYXVsdCAoc2hpcExlbmd0aCwgc2hpcElEKSA9PiB7XG4gIC8vIFByb3BlcnRpZXM6XG4gIC8vICBMZW5ndGhcbiAgLy8gIE51bWJlcnMgb2YgdGltZXMgaGl0XG4gIC8vICBTdW5rICh0cnVlL2ZhbHNlKVxuICAvLyBNZXRob2RzOlxuICAvLyAgSGl0LCBpbmNyZWFzZXMgdGhlIG51bWJlciBvZiDigJhoaXRz4oCZIGluIHlvdXIgc2hpcC5cbiAgLy8gIGlzU3VuaygpIGNhbGN1bGF0ZXMgd2hldGhlciBhIHNoaXAgaXMgY29uc2lkZXJlZCBzdW5rXG4gIC8vICAgIEJhc2VkIG9uIGl0cyBsZW5ndGggYW5kIHRoZSBudW1iZXIgb2YgaGl0cyBpdCBoYXMgcmVjZWl2ZWQuXG4gIC8vIC0gQ2Fycmllclx0ICAgIDVcbiAgLy8gLSBCYXR0bGVzaGlwXHQgIDRcbiAgLy8gLSBEZXN0cm95ZXJcdCAgM1xuICAvLyAtIFN1Ym1hcmluZVx0ICAzXG4gIC8vIC0gUGF0cm9sIEJvYXRcdDJcbiAgLy8gY29uc3QgbGVuZ3RoID0gc2l6ZTtcbiAgLy8gSG93IG9yIHdoZW4gdG8gaW5pdGlhbGl6ZSBhIHNoaXAncyBsZW5ndGhcbiAgLy8gV2hhdCBkZXRlcm1pbmVzIGEgc2hpcHMgbGVuZ3RoP1xuICBjb25zdCBsZW5ndGggPSBzaGlwTGVuZ3RoO1xuICBjb25zdCBpZCA9IHNoaXBJRDtcbiAgbGV0IG51bUhpdHMgPSAwO1xuICBsZXQgc3VuayA9IGZhbHNlO1xuICBjb25zdCBoaXQgPSAoKSA9PiB7XG4gICAgaWYgKCFzdW5rKSBudW1IaXRzICs9IDE7XG4gIH07XG4gIGNvbnN0IGlzU3VuayA9ICgpID0+IHtcbiAgICBzdW5rID0gbnVtSGl0cyA9PT0gbGVuZ3RoO1xuICAgIHJldHVybiBzdW5rO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgaGl0LFxuICAgIGlzU3VuayxcbiAgICBnZXQgbGVuZ3RoKCkge1xuICAgICAgcmV0dXJuIGxlbmd0aDtcbiAgICB9LFxuICAgIGdldCBpZCgpIHtcbiAgICAgIHJldHVybiBpZDtcbiAgICB9LFxuICB9O1xufTtcbiIsImltcG9ydCBnZW5lcmF0ZVVVSUQgZnJvbSAnLi9nZW5lcmF0ZVVVSUQnO1xuXG5jb25zdCBCdWlsZEVsZW1lbnQgPSAoc3RhdGUpID0+ICh7XG4gIHNldEF0dHJpYnV0ZXM6IChhdHRyaWJ1dGVzKSA9PiB7XG4gICAgT2JqZWN0LmVudHJpZXMoYXR0cmlidXRlcykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICBpZiAoa2V5ICE9PSAndGV4dENvbnRlbnQnKSB7XG4gICAgICAgIGlmIChrZXkgPT09ICdjbGFzcycpIHtcbiAgICAgICAgICBzdGF0ZS5zZXRDbGFzc05hbWUodmFsdWUuc3BsaXQoL1xccy8pKTtcbiAgICAgICAgfSBlbHNlIGlmIChrZXkgPT09ICdzdHlsZScpIHtcbiAgICAgICAgICBzdGF0ZS5zZXRTdHlsZSh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnZGF0YS1pZCcpIHtcbiAgICAgICAgICBzdGF0ZS5zZXRBdHRyaWJ1dGUoa2V5LCBnZW5lcmF0ZVVVSUQoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RhdGUuc2V0QXR0cmlidXRlKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5zZXRUZXh0Q29udGVudCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIHNldFN0eWxlOiAodGV4dCkgPT4ge1xuICAgIHN0YXRlLnN0eWxlLmNzc1RleHQgPSB0ZXh0O1xuICB9LFxuICBzZXRDbGFzc05hbWU6IChhcnJDbGFzcykgPT4ge1xuICAgIGFyckNsYXNzLmZvckVhY2goKGNsYXNzTmFtZSkgPT4gc3RhdGUuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpKTtcbiAgfSxcbiAgc2V0VGV4dENvbnRlbnQ6ICh0ZXh0KSA9PiB7XG4gICAgc3RhdGUudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB9LFxuICBzZXRDaGlsZHJlbjogKGNoaWxkcmVuKSA9PiB7XG4gICAgY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQoY2hpbGQuZWxlbWVudCk7XG4gICAgICBpZiAoY2hpbGQuYXR0cmlidXRlcyAmJiBjaGlsZC5hdHRyaWJ1dGVzLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdPYmplY3QnKSB7XG4gICAgICAgIGNoaWxkRWxlbWVudC5zZXRBdHRyaWJ1dGVzKGNoaWxkLmF0dHJpYnV0ZXMpO1xuICAgICAgfVxuICAgICAgaWYgKGNoaWxkLmNoaWxkcmVuKSB7XG4gICAgICAgIC8vIFdoYXQgaWYgY2hpbGQgb2YgY2hpbGQuY2hpbGRyZW4gaGFzIGNoaWxkcmVuP1xuICAgICAgICBjaGlsZEVsZW1lbnQuc2V0Q2hpbGRyZW4oY2hpbGQuY2hpbGRyZW4pO1xuICAgICAgfVxuICAgICAgc3RhdGUuYXBwZW5kQ2hpbGQoY2hpbGRFbGVtZW50KTtcbiAgICB9KTtcbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZykge1xuICBjb25zdCBodG1sRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcblxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihodG1sRWxlbWVudCwgQnVpbGRFbGVtZW50KGh0bWxFbGVtZW50KSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IDYgY2hhcmFjdGVycyBmcm9tIGNyeXB0by5yYW5kb21VVUlEKClcbiAgLy8gUHNldWRvLXJhbmRvbWx5IGNoYW5nZXMgYSBsb3dlcmNhc2UgbGV0dGVyIHRvIHVwcGVyY2FzZVxuICBjb25zdCB1dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgcmV0dXJuIFsuLi51dWlkLnN1YnN0cmluZygwLCB1dWlkLmluZGV4T2YoJy0nKSldLnJlZHVjZSgod29yZCwgY3VycmVudENoYXIpID0+IHtcbiAgICBjb25zdCBjaGVjayA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpO1xuICAgIGlmIChjaGVjayA9PSBmYWxzZSAmJiBjdXJyZW50Q2hhci5tYXRjaCgvW2Etel0vKSkge1xuICAgICAgcmV0dXJuIHdvcmQgKyBjdXJyZW50Q2hhci50b1VwcGVyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gd29yZCArIGN1cnJlbnRDaGFyO1xuICB9KTtcbn07XG5cbi8qXG5PcHRpb25hbCB3YXkgbm90IHVzaW5nIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKVxuY29uc3QgZ2VuZXJhdGVVVUlEID0gKCkgPT4ge1xuICBjb25zdCB1dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICByZXR1cm4gWy4uLnV1aWQuc3Vic3RyaW5nKDAsIHV1aWQuaW5kZXhPZignLScpKV0ubWFwKChjaGFyKSA9PiB7XG4gICAgICBjb25zdCBjaGVjayA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIpO1xuICAgICAgaWYgKGNoZWNrID09IGZhbHNlICYmIGNoYXIubWF0Y2goL1thLXpdLykpIHtcbiAgICAgICAgcmV0dXJuIGNoYXIudG9VcHBlckNhc2UoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGFyO1xuICAgIH0pLmpvaW4oJycpO1xufTtcbiovXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=