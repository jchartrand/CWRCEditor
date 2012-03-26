var Writer = function(config) {
	config = config || {};
	var w = {
		editor: null, // reference to the tinyMCE instance we're creating, set in setup
		entities: {}, // entities store
		structs: {}, // structs store
		triples: [], // triples store

		schema: {}, // schema for additional custom tags
		formattedSchema: '', // all the element & attribute names from the schema (used in extended_valid_elements config setting)
		
		project: config.project, // the current project (cwrc or russell)
		
		baseUrl: 'http://apps.testing.cwrc.ca/',
		
		schemaCSS: 'css/orlando.css', // css for schema tags used in the editor
		
		// tag types and their titles
		titles: {
			person: 'Person',
			date: 'Date',
			place: 'Place',
			event: 'Event',
			org: 'Organization',
			citation: 'Citation',
			note: 'Note',
			title: 'Text/Title'
		},
		
		// editor mode
		mode: config.mode,
		
		// schema for validation (common or events)
		validationSchema: 'common',
		
		// root block element, should come from schema
		root: 'div0',
		
		// possible editor modes
		XMLRDF: 0, // allows for overlapping elements, i.e. entities
		XML: 1, // standard xml, no overlapping elements
		
		// possible results when trying to add entity
		NO_SELECTION: 0,
		NO_COMMON_PARENT: 1,
		VALID: 2,
		
		fixEmptyStructTag: false, // whether to check the current empty struct tag for the &#65279; we inserted and then remove it
		
		fm: null, // filemanager
		entitiesList: null, // entities list
		tree: null, // structure tree
		relations: null, // relations list
		d: null, // dialog
		settings: null // settings dialog
	};
	
	var _onInitHandler = function(ed) {
		// parse schema css
		if (w.schemaCSS) {
			var name = w.schemaCSS.split('/');
			name = name[name.length-1];
			var stylesheets = ed.getDoc().styleSheets;
			var stylesheet = null;
			for (var i = 0; i < stylesheets.length; i++) {
				var s = stylesheets[i];
				if (s.href.indexOf(name) != -1) {
					stylesheet = s;
					break;
				}
			}
			if (stylesheet) {
				var parseCss = function() {
					var rules = stylesheet.cssRules;
					var newRules = '';
					// adapt the rules to our format, should only modify element names in selectors
					for (var i = 0; i < rules.length; i++) {
						var selector = rules[i].selectorText;
						var newSelector = selector.replace(/(^|,|\s)(\w+)/g, function(str, p1, p2, offset, s) {
							return p1+'span[_tag="'+p2.toLowerCase()+'"]';
						});
						var css = rules[i].cssText;
						var newCss = css.replace(selector, newSelector);
						newRules += newCss+'\n';
					}
					
					var doc = ed.getDoc();
					var styleEl = doc.createElement('style');
					var styleType = doc.createAttribute('type');
					styleType.value = 'text/css';
					styleEl.setAttributeNode(styleType);
					var styleText = doc.createTextNode(newRules);
					styleEl.appendChild(styleText);
					doc.head.appendChild(styleEl);
					stylesheet.disabled = true;
				};
				// error thrown unless...
				setTimeout(parseCss, 0);
			}
		}
		
		var settings = w.settings.getSettings();
		if (settings.showEntityBrackets) ed.$('body').addClass('showEntityBrackets');
		if (settings.showStructBrackets) ed.$('body').addClass('showStructBrackets');
		
		ed.setContent('<'+w.root+'><span _struct="true" _tag="div1">Paste or type your text here.</span></'+w.root+'>');
		
		ed.addCommand('isSelectionValid', w.isSelectionValid);
		ed.addCommand('showError', w.showError);
		ed.addCommand('addEntity', w.addEntity);
		ed.addCommand('editTag', w.editTag);
		ed.addCommand('removeTag', w.removeTag);
		ed.addCommand('copyEntity', w.copyEntity);
		ed.addCommand('pasteEntity', w.pasteEntity);
		ed.addCommand('removeEntity', w.removeEntity);
		ed.addCommand('addStructureTag', w.addStructureTag);
		ed.addCommand('editStructureTag', w.editStructureTag);
		ed.addCommand('updateStructureTree', w.tree.update);
		ed.addCommand('removeHighlights', w.removeHighlights);
		ed.addCommand('exportDocument', w.fm.exportDocument);
		ed.addCommand('loadDocument', w.fm.loadDocument);
		ed.addCommand('getFilteredSchema', w.getFilteredSchema);
		
		// used in conjunction with the paste plugin
		// needs to be false in order for paste postprocessing to function properly
		ed.pasteAsPlainText = false;
		
		// highlight tracking
		ed.onMouseUp.add(_doHighlightCheck);
		
		ed.onKeyUp.add(function(ed, evt) {
			// nav keys check
			if (evt.keyCode >= 33 || evt.keyCode <= 40) {
				_doHighlightCheck(ed, evt);
			}
			
			// update current entity
			if (ed.currentEntity) {
				var content = ed.$('#entityHighlight').text();
				var entity = w.entities[ed.currentEntity];
				entity.content = content;
				entity.title = w.getTitleFromContent(content);
				$('#entities li[name="'+ed.currentEntity+'"] > span[class="entityTitle"]').html(entity.title);
			}
			
			// delete keys check
			// need to do this here instead of in onchangehandler because that one doesn't update often enough
			if (evt.keyCode == 8 || evt.keyCode == 46) {
				_findDeletedTags();
				w.tree.update();
			}
		});
		
		$(ed.dom.doc).keydown(function(e) {
			// redo/undo listener
			if ((e.keyCode == 89 || e.keyCode == 90) && e.ctrlKey) {
				_findDeletedTags();
				w.entitiesList.update();
				w.tree.update();
			}
			if (w.fixEmptyStructTag && ed.currentStruct) {
				ed.$('#'+ed.currentStruct).contents().each(function(index, el) {
					if (el.nodeValue && el.nodeValue.charCodeAt(0) == 65279) {
						el.nodeValue = '';
						w.fixEmptyStructTag = false;
						return false;
					}
				});
			}
		});
		
		// create css to display schema tags
		$('head', ed.dom.doc).append('<style id="schemaTags" type="text/css" />');
		var tag = w.schema[w.root].displayName;
		var schemaTags = w.root+' { display: block; }';
		schemaTags += '.showStructBrackets '+w.root+':before { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "<'+tag+'>"; }';
		schemaTags += '.showStructBrackets '+w.root+':after { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "</'+tag+'>"; }';
		for (var key in w.schema) {
			tag = w.schema[key].displayName;
			schemaTags += '.showStructBrackets span[_tag='+key+']:before { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "<'+tag+'>"; }';
			schemaTags += '.showStructBrackets span[_tag='+key+']:after { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "</'+tag+'>"; }';
		}
		$('#schemaTags', ed.dom.doc).text(schemaTags);
		
		_doResize();
		
		// populate with initial content
		w.tree.update();
	};
	
	var _findDeletedTags = function() {
		for (var id in w.entities) {
			var nodes = w.editor.dom.select('span[name="'+id+'"]');
			switch (nodes.length) {
				case 0:
					delete w.entities[id];
					w.entitiesList.remove(id);
					break;
				case 1:
					w.editor.dom.remove(nodes[0]);
					delete w.entities[id];
					w.entitiesList.remove(id);
			}
		}
		for (var id in w.structs) {
			var nodes = w.editor.dom.select('#'+id);
			if (nodes.length == 0) {
				delete w.structs[id];
			}
		}
	};
	
	var _findDuplicateTags = function() {
		for (id in w.entities) {
			var match = w.editor.$('span[class~="start"][name="'+id+'"]');
			if (match.length > 1) {
				match.each(function(index, el) {
					if (index > 0) {
						var newId = tinymce.DOM.uniqueId('ent_');
						var newTagStart = $(el);
						var newTagEnd = $(w.getCorrespondingEntityTag(newTagStart));
						newTagStart.attr('name', newId);
						newTagEnd.attr('name', newId);

						var newEntity = jQuery.extend(true, {}, w.entities[id]);
						newEntity.props.id = newId;
						w.entities[newId] = newEntity;
					}
				});
			}
		}
		for (var id in w.structs) {
			var match = w.editor.$('*[id='+id+']');
			if (match.length == 2) {
				var newStruct = match.last();
				var newId = tinymce.DOM.uniqueId('struct_');
				newStruct.attr('id', newId);
				w.structs[newId] = {};
				for (var key in w.structs[id]) {
					w.structs[newId][key] = w.structs[id][key];
				}
				w.structs[newId].id = newId;
			}
		}
	};
	
	var _onChangeHandler = function(ed) {
		if (ed.isDirty()) {
			_findDeletedTags();
			w.tree.update();
		}
	};
	
	var _onNodeChangeHandler = function(ed, cm, e) {
		ed.currentNode = e;
	};
	
	var _onPasteHandler = function(ed, event) {
		window.setTimeout(function() {
			_findDuplicateTags();
			w.entitiesList.update();
			w.tree.update();
		}, 0);
	};
	
	var _doHighlightCheck = function(ed, evt) {
		var range = ed.selection.getRng(true);
		
		var entityStart = _findEntityBoundary('start', range.startContainer, null, [range.startContainer.parentNode]);
		var entityEnd = _findEntityBoundary('end', range.endContainer, null, [range.endContainer.parentNode]);
		
		if (entityEnd == null || entityStart == null) {
			w.highlightEntity();
			var parentNode = ed.$(ed.selection.getNode());
			if (parentNode.attr('_struct')) {
				var id = parentNode.attr('id');
				w.editor.currentStruct = id;
			}
			return;
		}
		
		var id = entityStart.getAttribute('name');
		if (id == ed.currentEntity) return;
		
		var bm = ed.selection.getBookmark();
		w.highlightEntity(id, bm);
	};
	
	/**
	 * Get the entity boundary tag that corresponds to the passed tag.
	 * @param tag
	 */
	w.getCorrespondingEntityTag = function(tag) {
		tag = $(tag);
		var corrTag;
		if (tag.hasClass('start')) {
			corrTag = _findEntityBoundary('end', tag[0].nextSibling, null, [tag[0].parentNode]);
		} else {
			corrTag = _findEntityBoundary('start', tag[0].previousSibling, null, [tag[0].parentNode]);
		}
		return corrTag;
	};
	
	/**
	 * Searches for an entity boundary containing the current node.
	 * @param boundaryType Either 'start' or 'end'.
	 * @param currentNode The node that is currently being examined.
	 * @param currentId The id of an entity that is also contained within the entity we're looking for.  Used to prevent false positives.
	 * @param levels An array to track the levels of node depth in order to prevent endless recursion.
	 */
	var _findEntityBoundary = function(boundaryType, currentNode, currentId, levels) {
		if (w.editor.dom.hasClass(currentNode, 'entity')) {
			if (w.editor.dom.hasClass(currentNode, boundaryType)) {
				if (currentId == null || currentId != currentNode.getAttribute('name')) {
					return currentNode;
				} else if (currentId == currentNode.getAttribute('name')) {
					currentId = null;
				}
			} else {
				currentId = currentNode.getAttribute('name');
			}
		}
		
		if (boundaryType == 'start' && currentNode.lastChild) {
			levels.push(currentNode);
			return _findEntityBoundary(boundaryType, currentNode.lastChild, currentId, levels);
		} else if (boundaryType == 'end' && currentNode.firstChild) {
			levels.push(currentNode);
			return _findEntityBoundary(boundaryType, currentNode.firstChild, currentId, levels);
		}
		
		if (boundaryType == 'start' && currentNode.previousSibling) {
			return _findEntityBoundary(boundaryType, currentNode.previousSibling, currentId, levels);
		} else if (boundaryType == 'end' && currentNode.nextSibling) {
			return _findEntityBoundary(boundaryType, currentNode.nextSibling, currentId, levels);
		}
		
		if (currentNode.parentNode) {
			if (currentNode.parentNode == levels[levels.length-1]) {
				levels.pop();
				if (boundaryType == 'start' && currentNode.parentNode.previousSibling) {
					return _findEntityBoundary(boundaryType, currentNode.parentNode.previousSibling, currentId, levels);
				} else if (boundaryType == 'end' && currentNode.parentNode.nextSibling) {
					return _findEntityBoundary(boundaryType, currentNode.parentNode.nextSibling, currentId, levels);
				} else return null;
			} else {
				return _findEntityBoundary(boundaryType, currentNode.parentNode, currentId, levels);
			}
		}
		
		return null;
	};
	
	w.highlightEntity = function(id, bm, doScroll) {
		w.editor.currentEntity = null;
		
		var prevHighlight = w.editor.$('#entityHighlight');
		if (prevHighlight.length == 1) {
			var parent = prevHighlight.parent()[0];
			prevHighlight.contents().unwrap();
			parent.normalize();
			
			$('#entities > ul > li').each(function(index, el) {
				$(this).removeClass('selected').css('background-color', '').find('div[class="info"]').hide();
			});
		}
		
		if (id) {
			w.editor.currentEntity = id;
			var type = w.entities[id].props.type;
			var markers = w.editor.dom.select('span[name="'+id+'"]');
			var start = markers[0];
			var end = markers[1];
			
			var nodes = [start];
			var currentNode = start;
			while (currentNode != end  && currentNode != null) {
				currentNode = currentNode.nextSibling;
				nodes.push(currentNode);
			}
			
			w.editor.$(nodes).wrapAll('<span id="entityHighlight" class="'+type+'"/>');
			
			// maintain the original caret position
			if (bm) {
				w.editor.selection.moveToBookmark(bm);
			}
			
			if (doScroll) {
				var val = w.editor.$(start).offset().top;
				w.editor.$(w.editor.dom.doc.body).scrollTop(val);
			}
			
			$('#entities > ul > li[name="'+id+'"]').addClass('selected').find('div[class="info"]').show();
		}
	};
	
	// checks the user selection and potential entity markers
	w.isSelectionValid = function(isStructTag) {
		var sel = w.editor.selection;
		if (!isStructTag) {
			if (sel.isCollapsed()) return w.NO_SELECTION;
			if (sel.getContent() == '') return w.NO_SELECTION;
		}
		
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
		
		// fix for when start and/or end containers are element nodes (should always be text nodes for entities)
		if (!isStructTag) {
			if (range.startContainer.nodeType == Node.ELEMENT_NODE) {
				var end = range.endContainer;
				if (end.nodeType != Node.TEXT_NODE || range.endOffset == 0) {
					var findTextNode = function(currNode, reps) {
						if (reps > 10) return null; // prevent infinite recursion
						else {
							var prevNode = currNode.previousSibling || currNode.parentNode.previousSibling.lastChild;
							if (prevNode == null) return null;
							if (prevNode.nodeType == Node.TEXT_NODE) return prevNode;
							return findTextNode(prevNode, reps++);
						}
					};
					end = findTextNode(range.endContainer, 0);
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
		
		if (range.startContainer.parentNode != range.endContainer.parentNode) return w.NO_COMMON_PARENT;
		
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
	
	w.showError = function(errorType) {
		switch(errorType) {
		case w.NO_SELECTION:
			w.d.show('message', {
				title: 'Error',
				msg: 'Please select some text before adding an entity or tag.'
			});
			break;
		case w.NO_COMMON_PARENT:
			w.d.show('message', {
				title: 'Error',
				msg: 'Please ensure that the beginning and end of your selection have a common parent.<br/>For example, your selection cannot begin in one paragraph and end in another, or begin in bolded text and end outside of that text.'
			});
		}
	};
	
	w.addEntity = function(type) {
		var result = w.isSelectionValid();
		if (result == w.VALID) {
			w.editor.currentEntity = _addEntityTag(type);
			w.d.show(type, {type: type, title: w.titles[type], pos: w.editor.contextMenuPos});
		} else {
			w.showError(result);
		}
	};
	
	var _addEntityTag = function(type) {
		var sel = w.editor.selection;
		var content = sel.getContent();
		var range = sel.getRng(true);
		
		// strip tags
		content = content.replace(/<\/?[^>]+>/gi, '');
		
		// trim whitespace
		if (range.startContainer == range.endContainer) {
			var leftTrimAmount = content.match(/^\s{0,1}/)[0].length;
			var rightTrimAmount = content.match(/\s{0,1}$/)[0].length;
			range.setStart(range.startContainer, range.startOffset+leftTrimAmount);
			range.setEnd(range.endContainer, range.endOffset-rightTrimAmount);
			sel.setRng(range);
			content = content.replace(/^\s+|\s+$/g, '');
		}
		
		var title = w.getTitleFromContent(content);
		
		var id = tinymce.DOM.uniqueId('ent_');
		
		w.entities[id] = {
			props: {
				id: id,
				type: type,
				title: title,
				content: content
			},
			info: {}
		};
		
		w.insertBoundaryTags(id, type, range);
		
		return id;
	};
	
	w.insertBoundaryTags = function(id, type, range) {
		var sel = w.editor.selection;
		var bm = sel.getBookmark();
		
		var start = w.editor.dom.create('span', {'_entity': true, '_type': type, 'class': 'entity '+type+' start', 'name': id});
		range.insertNode(start);
		w.editor.dom.bind(start, 'click', _doMarkerClick);
		
		w.editor.selection.moveToBookmark(bm);
		
		var end = w.editor.dom.create('span', {'_entity': true, '_type': type, 'class': 'entity '+type+' end', 'name': id});
		sel.collapse(false);
		range = sel.getRng(true);
		range.insertNode(end);
		w.editor.dom.bind(end, 'click', _doMarkerClick);
	};
	
	w.finalizeEntity = function(id, info) {
		if (info == null) {
			w.removeEntity(id);
		} else {
			var startTag = w.editor.$('[name='+id+'][class~=start]');
			for (var key in info) {
				startTag.attr(key, w.sanitizeAttributeValue(info[key]));
			}
			
			w.entities[id].info = info;
			w.entitiesList.update();
			w.highlightEntity(id);
		}
	};
	
	var _getCurrentTag = function(id) {
		var tag = {entity: null, struct: null};
		if (id != null) {
			if (w.entities[id]) tag.entity = w.entities[id];
			else if (w.structs[id]) tag.struct = w.editor.$('#'+id);
		} else {
			if (w.editor.currentEntity != null) tag.entity = w.entities[w.editor.currentEntity];
			else if (w.editor.currentStruct != null) tag.struct = w.editor.$('#'+w.editor.currentStruct);
		}
		return tag;
	};
	
	// a general edit function for entities and structure tags
	w.editTag = function(id, pos) {
		var tag = _getCurrentTag(id);
		if (tag.struct) {
			if (w.editor.$(tag.struct).attr('_struct')) {
				w.editor.execCommand('editSchemaTag', tag.struct, pos);
			} else {
				w.editor.execCommand('editCustomTag', tag.struct, pos);
			}
		} else if (tag.entity) {
			var type = tag.entity.props.type;
			w.d.show(type, {type: type, title: w.titles[type], pos: pos, entry: tag.entity});
		}
	};
	
	w.copyEntity = function(id, pos) {
		var tag = _getCurrentTag(id);
		if (tag.entity) {
			w.editor.entityCopy = tag.entity;
		} else {
			w.d.show('message', {
				title: 'Error',
				msg: 'Cannot copy structural tags.'
			});
		}
	};
	
	w.pasteEntity = function(pos) {
		if (w.editor.entityCopy == null) {
			w.d.show('message', {
				title: 'Error',
				msg: 'No entity to copy!'
			});
		} else {
			var newEntity = jQuery.extend(true, {}, w.editor.entityCopy);
			newEntity.props.id = tinymce.DOM.uniqueId('ent_');
			
			var sel = w.editor.selection;
			sel.collapse();
			var rng = sel.getRng(true);
			
			var start = w.editor.dom.create('span', {'class': 'entity '+newEntity.props.type+' start', 'name': newEntity.props.id, '_entity': true});
			var text = w.editor.getDoc().createTextNode(newEntity.props.content);
			var end = w.editor.dom.create('span', {'class': 'entity '+newEntity.props.type+' end', 'name': newEntity.props.id, '_entity': true});
			var span = w.editor.dom.create('span', {id: 'entityHighlight'});
			w.editor.dom.add(span, start);
			w.editor.dom.add(span, text);
			w.editor.dom.add(span, end);

			rng.insertNode(span);
			
			w.editor.dom.bind(start, 'click', _doMarkerClick);
			w.editor.dom.bind(end, 'click', _doMarkerClick);
			
			w.entities[newEntity.props.id] = newEntity;
			
			w.entitiesList.update();
			w.highlightEntity(newEntity.props.id);
		}
	};
	
	// a general removal function for entities and structure tags
	w.removeTag = function(id) {
		if (id != null) {
			if (w.entities[id]) {
				w.removeEntity(id);
			} else if (w.structs[id]) {
				w.removeStructureTag(id);
			}
		} else {
			if (w.editor.currentEntity != null) {
				w.removeEntity(w.editor.currentEntity);
			} else if (w.editor.currentStruct != null) {
				w.removeStructureTag(w.editor.currentStruct);
			}
		}
	};
	
	w.removeEntity = function(id) {
		id = id || w.editor.currentEntity;
		
		delete w.entities[id];
		var node = w.editor.$('span[name="'+id+'"]');
		var parent = node[0].parentNode;
		node.remove();
		parent.normalize();
		w.highlightEntity();
		w.entitiesList.remove(id);
	};
	
	w.getTitleFromContent = function(content) {
		if (content.length <= 34) return content;
		var title = content.substring(0, 34) + '&#8230;';
		return title;
	};
	
	// prevents the user from moving the caret inside a marker
	var _doMarkerClick = function(e) {
		var marker = w.editor.dom.get(e.target);
		var range = w.editor.selection.getRng(true);
		if (w.editor.dom.hasClass(marker, 'start')) {
			range.setStartAfter(marker);
			range.setEndAfter(marker);
		} else {
			range.setStartBefore(marker);
			range.setEndBefore(marker);
		}
		w.editor.selection.setRng(range);
		w.highlightEntity(marker.getAttribute('name'), w.editor.selection.getBookmark());
	};
	
	w.addStructureTag = function(bookmark, attributes) {
		var id = tinymce.DOM.uniqueId('struct_');
		attributes.id = id;
		w.structs[id] = attributes;
		w.editor.currentStruct = id;
		
		w.editor.selection.moveToBookmark(bookmark);
		var selection = w.editor.selection.getContent();
		// add zero width no-break space, required for proper cursor positioning inside tag
		// doesn't work in IE
		if (selection == '') selection = '&#65279;';
		
		var tag = 'span';
		var open_tag = '<'+tag;
		for (var key in attributes) {
			open_tag += ' '+key+'="'+w.sanitizeAttributeValue(attributes[key])+'"';
		}
		open_tag += '>';
		var close_tag = '</'+tag+'>';
		var content = open_tag + selection + close_tag;
		w.editor.execCommand('mceReplaceContent', false, content);
		w.tree.update();
		
		if (selection == '&#65279;') {
			w.fixEmptyStructTag = true;
			var range = w.editor.selection.getRng(true);
			range.selectNodeContents(w.editor.$('#'+id)[0]);
			range.collapse(true);
		}
	};
	
	w.editStructureTag = function(tag, attributes) {
		var id = tag.attr('id');
		for (var key in attributes) {
			tag.attr(key, attributes[key]);
		}
		w.structs[id] = attributes;
		w.tree.update();
	};
	
	w.removeStructureTag = function(id) {
		id = id || w.editor.currentStruct;
		
		if (w.editor.$('#'+id).is('p')) return;
		
		delete w.structs[id];
		var node = w.editor.$('#'+id);
		var parent = node.parent()[0];
		var contents = node.contents();
		if (contents.length > 0) {
			contents.unwrap();
		} else {
			node.remove();
		}
		parent.normalize();
		w.tree.update();
	};
	
	w.selectStructureTag = function(id) {
		w.editor.currentStruct = id;
		var node = w.editor.dom.select('#'+id)[0];
//		w.editor.selection.select(node);
		w.editor.getWin().getSelection().selectAllChildren(node); // not supported until IE 9
		
		// fire the onNodeChange event
		w.editor.parents = [];
		w.editor.dom.getParent(node, function(n) {
			if (n.nodeName == 'BODY')
				return true;

			w.editor.parents.push(n);
		});
		w.editor.onNodeChange.dispatch(w.editor, w.editor.controlManager, node, false, w.editor);
		
		w.editor.focus();
	};
	
	w.removeHighlights = function() {
		w.highlightEntity();
	};
	
	w.getFilteredSchema = function(filterKey) {
		var validKeys = {};
		
		var getSubElements = function(key, validKeys) {
			var entry = w.schema[key];
			if (entry) {
//				var addedNew = false;
				var e;
				for (var i = 0; i < entry.elements.length; i++) {
					e = entry.elements[i].name;
					if (validKeys[e] == null) {
						validKeys[e] = true;
//						addedNew = true;
//						getSubElements(e, validKeys);
					}
				}
//				if (!addedNew) {
//					return;
//				}
			}
		};
		
		getSubElements(filterKey, validKeys);
		
		return validKeys;
	};
	
	w.sanitizeAttributeValue = function(value) {
		if (typeof value == 'string') {
			return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		} else {
			return value;
		}
	};
	
	var _doResize = function() {
		var newHeight = $(window).height() - 30;
		$('#leftcol > div').height(newHeight);
		$('#'+w.editor.id+'_ifr').height(newHeight - 53);
		var tabHeight = $('#tabs ul').height();
		$('#tabs > div').height(newHeight - tabHeight - 7);
	};
	
	w.toggleSidepanel = function() {
		if ($('#main').css('marginLeft') == '6px') {
			$('#main').css('marginLeft', '250px');
			$('#tabs').show();
			$('#leftcol').width(250);
			$('#separator').addClass('arrowLeft').removeClass('arrowRight');
		} else {
			$('#main').css('marginLeft', '6px');
			$('#tabs').hide();
			$('#leftcol').width(6);
			$('#separator').addClass('arrowRight').removeClass('arrowLeft');
		}
	};
	
	/**
	 * Begin init functions
	 */
	
	w.init = function() {
		if (w.mode != null && w.mode == 'xml') {
			w.mode = w.XML;
		} else {
			w.mode = w.XMLRDF;
		}
		
		$.ajax({
			url: 'js/schema.js',
			success: function(data, status, xhr) {
				var schema = eval(xhr.responseText)[0];
				
				var sortedSchema = {}, key, a = [];

			    for (key in schema) {
//			    	schema[key].displayName = schema[key].displayName.replace('-element', '');
			        if (schema.hasOwnProperty(key)) {
			            a.push(key);
			        }
			    }
			    a.sort();

			    for (key = 0; key < a.length; key++) {
			    	sortedSchema[a[key]] = schema[a[key]];
			    }
			    w.schema = sortedSchema;
				
			    // need to get the schema before we can initialize the editor
				w._initEditor();
			}
		});
		
		w.fm = new FileManager({writer: w});
		w.tree = new StructureTree({writer: w});
		w.entitiesList = new EntitiesList({writer: w});
		w.relations = new Relations({writer: w});
		w.d = new DialogManager({writer: w});
		w.settings = new SettingsDialog(w, {
			showEntityBrackets: true,
			showStructBrackets: false
		});
		
		$('#separator').click(w.toggleSidepanel);
		$('#tabs').tabs();
	};
	
	w._initEditor = function() {
		var schemaEntry, att;
		var atts = {
			'id': true,
			'class': true,
			'name': true,
			'_entity': true,
			'_type': true,
			'_tag': true,
			'_display': true,
			'_struct': true,
			'_editable': true
		};
		// TODO add atts for entities
		for (var key in w.schema) {
			schemaEntry = w.schema[key];
			for (var i = 0; i < schemaEntry.attributes.length; i++) {
				att = schemaEntry.attributes[i].name;
				if (!atts[att]) atts[att] = true;
			}
		}
		for (var key in atts) {
			w.formattedSchema += key+'|';
		}
		w.formattedSchema = w.formattedSchema.substr(0, w.formattedSchema.length-1);
		
		$('#editor').tinymce({
			script_url : 'js/tinymce/jscripts/tiny_mce/tiny_mce.js',
//		tinyMCE.init({
//			mode: 'exact',
//			elements: 'editor',
			theme: 'advanced',
			
			content_css: 'css/editor.css'+', '+w.schemaCSS,
			
			width: '100%',
			
			contextmenu_never_use_native: true,
			
			setup: function(ed) {
				// link the writer and editor
				w.editor = ed;
				ed.writer = w;
				
				// custom properties added to the editor
				ed.currentEntity = null; // the id of the currently highlighted entity
				ed.currentStruct = null; // the id of the currently selected structural tag
				ed.currentNode = null; // the node that the cursor is currently in
				ed.entityCopy = null; // store a copy of an entity for pasting
				ed.contextMenuPos = null; // the position of the context menu (used to position related dialog box)
				
				ed.onInit.add(_onInitHandler);
				ed.onChange.add(_onChangeHandler);
				ed.onNodeChange.add(_onNodeChangeHandler);
				ed.onPaste.add(_onPasteHandler);
				
				// add schema file and method
				ed.addCommand('getSchema', function(){
					return w.schema;
				});
				
				// add root to block elements
				tinymce.html.Schema.blockElementsMap[w.root.toUpperCase()] = {};
				
				// add custom plugins and buttons
				var plugins = ['customtags','schematags','currenttag','entitycontextmenu','viewsource'];
				
				for (var i = 0; i < plugins.length; i++) {
					var name = plugins[i];
					tinymce.PluginManager.load(name, '../../../tinymce_plugins/'+name+'.js');
				}
				
				ed.addButton('addperson', {
					title: 'Tag Person',
					image: 'img/user.png',
					'class': 'entityButton person',
					onclick : function() {
						ed.execCommand('addEntity', 'person');
					}
				});
				ed.addButton('addplace', {
					title: 'Tag Place',
					image: 'img/world.png',
					'class': 'entityButton place',
					onclick : function() {
						ed.execCommand('addEntity', 'place');
					}
				});
				ed.addButton('adddate', {
					title: 'Tag Date',
					image: 'img/calendar.png',
					'class': 'entityButton date',
					onclick : function() {
						ed.execCommand('addEntity', 'date');
					}
				});
				ed.addButton('addevent', {
					title: 'Tag Event',
					image: 'img/cake.png',
					'class': 'entityButton event',
					onclick : function() {
						ed.execCommand('addEntity', 'event');
					}
				});
				ed.addButton('addorg', {
					title: 'Tag Organization',
					image: 'img/group.png',
					'class': 'entityButton org',
					onclick : function() {
						ed.execCommand('addEntity', 'org');
					}
				});
				ed.addButton('addcitation', {
					title: 'Tag Citation',
					image: 'img/vcard.png',
					'class': 'entityButton citation',
					onclick : function() {
						ed.execCommand('addEntity', 'citation');
					}
				});
				ed.addButton('addnote', {
					title: 'Tag Note',
					image: 'img/note.png',
					'class': 'entityButton note',
					onclick : function() {
						ed.execCommand('addEntity', 'note');
					}
				});
				ed.addButton('addtitle', {
					title: 'Tag Text/Title',
					image: 'img/book.png',
					'class': 'entityButton textTitle',
					onclick : function() {
						ed.execCommand('addEntity', 'title');
					}
				});
				
				ed.addButton('editTag', {
					title: 'Edit Tag',
					image: 'img/tag_blue_edit.png',
					'class': 'entityButton',
					onclick : function() {
						ed.execCommand('editTag');
					}
				});
				
				ed.addButton('removeTag', {
					title: 'Remove Tag',
					image: 'img/cross.png',
					'class': 'entityButton',
					onclick : function() {
						ed.execCommand('removeTag');
					}
				});
				
				ed.addButton('savebutton', {
					title: 'Save',
					image: 'img/save.png',
					onclick: function() {
						w.fm.validate(true);
					}
				});
				
				ed.addButton('saveasbutton', {
					title: 'Save As',
					image: 'img/save_as.png',
					onclick: function() {
						w.fm.openSaver();
					}
				});
				
				ed.addButton('loadbutton', {
					title: 'Load',
					image: 'img/folder_page.png',
					'class': 'entityButton',
					onclick: function() {
						w.fm.openLoader();
					}
				});
				
				ed.addButton('editsource', {
					title: 'Edit Source',
					image: 'img/editsource.gif',
					'class': 'wideButton',
					onclick: function() {
						w.fm.editSource();
					}
				});
				
				ed.addButton('validate', {
					title: 'Validate',
					image: 'img/validate.png',
					'class': 'entityButton',
					onclick: function() {
						w.fm.validate();
					}
				});
				
				ed.addButton('addtriple', {
					title: 'Add Relation',
					image: 'img/link_add.png',
					'class': 'entityButton',
					onclick: function() {
						$('#tabs').tabs('select', 2);
						w.d.show('triple');
					}
				});
				
//				ed.addButton('toggleeditor', {
//					title: 'Show Advanced Mode',
//					image: 'img/html.png',
//					'class': 'entityButton',
//					cmd: 'toggle_editor'
//				});
			},
			
			doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
			element_format: 'xhtml',
			
			forced_root_block : w.root,
//			force_br_newlines: false,
			force_p_newlines: true,
			
			paste_auto_cleanup_on_paste: true,
			paste_postprocess: function(pl, o) {
				function stripTags(index, node) {
					if (node.nodeName.toLowerCase() != 'p') {
						if ($(node).contents().length == 0) {
							$(node).remove();
						} else {
							var contents = $(node).contents().unwrap();
							contents.not(':text').each(stripTags);
						}
					} else {
						$(node).children().each(stripTags);
					}
				}
				
				function replacePTags(index, node) {
					if (node.nodeName.toLowerCase() == 'p') {
						$(node).contents().unwrap().wrapAll('<span _struct="true" _tag="p"></span>').not(':text').each(replacePTags);
					}
				}
				
				$(o.node).children().each(stripTags);
				$(o.node).children().each(replacePTags);
			},
			
			extended_valid_elements: w.root+',span['+w.formattedSchema+']',
			custom_elements: '~'+w.root,
			
			plugins: 'paste,-entitycontextmenu,-schematags,-currenttag,-viewsource',
			theme_advanced_buttons1: 'schematags,|,addperson,addplace,adddate,addevent,addorg,addcitation,addnote,addtitle,|,editTag,removeTag,|,addtriple,|,viewsource,editsource,|,validate,savebutton,saveasbutton,loadbutton',
			theme_advanced_buttons2: 'currenttag',
			theme_advanced_buttons3: '',
			theme_advanced_toolbar_location: 'top',
			theme_advanced_toolbar_align: 'left'
		});
		
		$(window).resize(_doResize);
	};
	
	return w;
};