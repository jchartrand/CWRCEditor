var Utilities = function(config) {
	var w = config.writer;
	
	var u = {};
	
	u.getTitleFromContent = function(content) {
		if (content.length <= 34) return content;
		var title = content.substring(0, 34) + '&#8230;';
		return title;
	};
	
	u.escapeHTMLString = function(value) {
		if (typeof value == 'string') {
			return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		} else {
			return value;
		}
	};
	
	u.unescapeHTMLString = function(value) {
		if (typeof value == 'string') {
			return value.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
		} else {
			return value;
		}
	};
	
	// checks the user selection and potential entity markers
	u.isSelectionValid = function(isStructTag) {
		var sel = w.editor.selection;
		
		// check for numerous overlap possibilities
		var range = sel.getRng(true);
		// next line commented out as it messes up the selection in IE
//		range.commonAncestorContainer.normalize(); // normalize/collapse separate text nodes
		
		// fix for select all and root node select
		if (range.commonAncestorContainer.nodeName.toLowerCase() == 'body') {
			var root = w.editor.$('body > *')[0];
			range.setStartBefore(root.firstChild);
			range.setEndAfter(root.lastChild);
		}
		
		function findTextNode(currNode, direction, reps) {
			if (reps > 20) return null; // prevent infinite recursion
			else {
				var newNode;
				if (direction == 'back') {
					newNode = currNode.lastChild || currNode.previousSibling || currNode.parentNode.previousSibling;
				} else {
					newNode = currNode.firstChild || currNode.nextSibling || currNode.parentNode.nextSibling;
				}
				if (newNode == null) return null;
				if (newNode.nodeType == Node.TEXT_NODE) return newNode;
				return findTextNode(newNode, direction, reps++);
			}
		}
		
		// fix for when start and/or end containers are element nodes (should always be text nodes for entities)
		if (!isStructTag) {
			if (range.startContainer.nodeType == Node.ELEMENT_NODE) {
				var end = range.endContainer;
				if (end.nodeType != Node.TEXT_NODE || range.endOffset == 0) {
					end = findTextNode(range.endContainer, 'back', 0);
					if (end == null) return w.NO_COMMON_PARENT;
					range.setEnd(end, end.length);
				}
				range.setStart(end, 0);
			}
			if (range.endContainer.nodeType == Node.ELEMENT_NODE) {
				// don't need to check nodeType here since we've already ensured startContainer is text
				range.setEnd(range.startContainer, range.startContainer.length);
			}
		}
		
		/**
		 * Removes whitespace surrounding the range.
		 * Also fixes cases where the range spans adjacent text nodes with different parents.
		 */
		function fixRange(range) {
			var content = range.toString();
			var match = content.match(/^\s+/);
			var leadingSpaces = 0, trailingSpaces = 0;
			if (match != null) {
				leadingSpaces = match[0].length;
			}
			match = content.match(/\s+$/);
			if (match != null) {
				trailingSpaces = match[0].length;
			}
			
			function shiftRangeForward(range, count, reps) {
				if (count > 0 && reps < 20) {
					if (range.startOffset < range.startContainer.length) {
						range.setStart(range.startContainer, range.startOffset+1);
						count--;
					}
					if (range.startOffset == range.startContainer.length) {
						var nextTextNode = findTextNode(range.startContainer, 'forward', 0);
						if (nextTextNode != null) {
							range.setStart(nextTextNode, 0);
						}
					}
					shiftRangeForward(range, count, reps++);
				}
			}
			
			function shiftRangeBackward(range, count, reps) {
				if (count > 0 && reps < 20) {
					if (range.endOffset > 0) {
						range.setEnd(range.endContainer, range.endOffset-1);
						count--;
					}
					if (range.endOffset == 0) {
						var prevTextNode = findTextNode(range.endContainer, 'back', 0);
						if (prevTextNode != null) {
							range.setEnd(prevTextNode, prevTextNode.length);
						}
					}
					shiftRangeBackward(range, count, reps++);
				}
			}
			
			shiftRangeForward(range, leadingSpaces, 0);
			shiftRangeBackward(range, trailingSpaces, 0);
			
			sel.setRng(range);
		}
		
		fixRange(range);
		
		if (range.startContainer.parentNode != range.endContainer.parentNode) {
			if (range.endOffset == 0 && range.endContainer.previousSibling == range.startContainer.parentNode) {
				// fix for when the user double-clicks a word that's already been tagged
				range.setEnd(range.startContainer, range.startContainer.length);
			} else {
				return w.NO_COMMON_PARENT;
			}
		}
		
		// extra check to make sure we're not overlapping with an entity
		if (isStructTag || w.mode == w.XML) {
			var c;
			var currentNode = range.startContainer;
			var ents = {};
			while (currentNode != range.endContainer) {
				currentNode = currentNode.nextSibling;
				c = $(currentNode);
				if (c.hasClass('entity')) {
					if (c.hasClass('start')) {
						ents[c.attr('name')] = true;
					} else {
						if (ents[c.attr('name')]) {
							delete ents[c.attr('name')];
						} else {
							return w.NO_COMMON_PARENT;
						}
					}
				}
			}
			var count = 0;
			for (var id in ents) {
				count++;
			}
			if (count != 0) return w.NO_COMMON_PARENT;
		}
		
		return w.VALID;
	};

	/**
	 * @param currEl The element that's currently being processed
	 * @param defHits A list of define tags that have already been processed
	 * @param level The level of recursion
	 * @param type The type of child to search for (element or attribute)
	 * @param children The children to return
	 */
	var _getChildren = function(currEl, defHits, level, type, children) {
		// first get the direct types
		currEl.find(type).each(function(index, el) {
			var child = $(el);
			if (child.parents('element').length > 0 && level > 0) {
				return; // don't get elements/attributes from other elements
			}
			var childObj = {name: child.attr('name'), level: level+0};
			childObj[type] = child;
			children.push(childObj);
		});
		// now process the references
		currEl.find('ref').each(function(index, el) {
			var name = $(el).attr('name');
			if ($(el).parents('element').length > 0 && level > 0) {
				return; // don't get attributes from other elements
			}
			if (!defHits[name]) {
				defHits[name] = true;
				var def = $('define[name="'+name+'"]', writer.schemaXML);
				_getChildren(def, defHits, level+1, type, children);
			}
		});
	};
	
	/**
	 * @param tag The element name to get children of
	 * @param type The type of children to get: "element" or "attribute"
	 * @param returnType Either: "array" or "object"
	 */
	u.getChildrenForTag = function(config) {
		var element = $('element[name="'+config.tag+'"]', writer.schemaXML);
		var type = config.type || 'element';
		var defHits = {};
		var level = 0;
		var children = [];
		_getChildren(element, defHits, level, type, children);

		if (config.returnType == 'array') {
			children.sort(function(a, b) {
				return a.level - b.level;
			});
			return children;
		} else {
			var childrenObj = {};
			for (var i = 0; i < children.length; i++) {
				var c = children[i];
				childrenObj[c.name] = c;
			}
			return childrenObj;
		}
	};
	
	var _getParentElementsFromDef = function(defName, defHits, level, parents) {
		$('define:has(ref[name="'+defName+'"])', writer.schemaXML).each(function(index, el) {
			var name = $(el).attr('name');
			if (!defHits[name]) {
				defHits[name] = true;
				var element = $(el).find('element').first();
				if (element.length == 1) {
					parents[element.attr('name')] = {name: element.attr('name'), level: level+0};
				} else {
					_getParentElementsFromDef(name, defHits, level+1, parents);
				}
			}
		});
	};
	
	u.getParentsForTag = function(tag) {
		var element = $('element[name="'+tag+'"]', writer.schemaXML);
		var defName = element.parents('define').attr('name');
		var parents = {};
		var defHits = {};
		var level = 0;
		_getParentElementsFromDef(defName, defHits, level, parents);
		return parents;
	};
	
	return u;
};