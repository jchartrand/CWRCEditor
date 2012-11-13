var Writer = function(config) {
	config = config || {};

	var w = {
		layout: null, // jquery ui layout object
		editor: null, // reference to the tinyMCE instance we're creating, set in setup
		entities: {}, // entities store
		structs: {}, // structs store
		triples: [], // triples store
		// store deleted tags in case of undo
		// TODO add garbage collection for this
		deletedEntities: {},
		deletedStructs: {},

		schemaXML: null, // a cached copy of the loaded schema
		schema: {elements: []}, // stores a list of all the elements of the loaded schema
		
		project: config.project, // the current project (cwrc or russell)
		
		baseUrl: window.location.protocol+'//'+window.location.host+'/',
		
		// editor mode
		mode: config.mode,
		
		// schema for validation (http://www.arts.ualberta.ca/~cwrc/schema/)
		validationSchema: 'cwrcbasic',
		
		// root block element, should come from schema
		root: '',
		// header element: hidden in editor view, can only edit from structure tree
		header: '',
		// id attribute name, based on schema
		idName: '',
		
		// possible editor modes
		XMLRDF: 0, // allows for overlapping elements, i.e. entities
		XML: 1, // standard xml, no overlapping elements
		
		// possible results when trying to add entity
		NO_SELECTION: 0,
		NO_COMMON_PARENT: 1,
		VALID: 2,
		
		fixEmptyTag: false, // whether to check for and remove a node inserted on empty struct add/select
		emptyTagId: null, // stores the id of the entities tag to be added
		
		u: null, // utilities
		fm: null, // filemanager
		entitiesList: null, // entities list
		tree: null, // structure tree
		relations: null, // relations list
		d: null, // dialog
		settings: null // settings dialog
	};
	
	var _onInitHandler = function(ed) {
		// modify isBlock method to check _tag attributes
		ed.dom.isBlock = function(node) {
			var type = node.nodeType;

			// If it's a node then check the type and use the nodeName
			if (type) {
				if (type === 1) {
					var tag = node.getAttribute('_tag') || node.nodeName;
					return !!(ed.schema.getBlockElements()[tag]);
				}
			}

			return !!ed.schema.getBlockElements()[node];
		};
		
		var settings = w.settings.getSettings();
		if (settings.showEntityBrackets) ed.$('body').addClass('showEntityBrackets');
		if (settings.showStructBrackets) ed.$('body').addClass('showStructBrackets');
		
		ed.addCommand('isSelectionValid', w.u.isSelectionValid);
		ed.addCommand('showError', w.showError);
		ed.addCommand('addEntity', w.addEntity);
		ed.addCommand('editTag', w.editTag);
		ed.addCommand('changeTag', w.changeTag);
		ed.addCommand('removeTag', w.removeTag);
		ed.addCommand('copyEntity', w.copyEntity);
		ed.addCommand('pasteEntity', w.pasteEntity);
		ed.addCommand('removeEntity', w.removeEntity);
		ed.addCommand('addStructureTag', w.addStructureTag);
		ed.addCommand('editStructureTag', w.editStructureTag);
		ed.addCommand('changeStructureTag', w.changeStructureTag);
		ed.addCommand('updateStructureTree', w.tree.update);
		ed.addCommand('removeHighlights', w.removeHighlights);
		ed.addCommand('exportDocument', w.fm.exportDocument);
		ed.addCommand('loadDocument', w.fm.loadDocument);
		ed.addCommand('getChildrenForTag', w.u.getChildrenForTag);
		ed.addCommand('getParentsForTag', w.u.getParentsForTag);
		ed.addCommand('getDocumentationForTag', w.getDocumentationForTag);
		
		// used in conjunction with the paste plugin
		// needs to be false in order for paste postprocessing to function properly
		ed.pasteAsPlainText = false;
		
		// highlight tracking
		ed.onMouseUp.add(function(ed, evt) {
			_hideContextMenus(evt);
			_doHighlightCheck(ed, evt);
		});
		
		ed.onKeyUp.add(_onKeyUpHandler);
		
		$(ed.dom.doc).keydown(function(e) {
			// redo/undo listener
			if ((e.which == 89 || e.which == 90) && e.ctrlKey) {
				_findDeletedTags();
				w.entitiesList.update();
				w.tree.update();
			}
		});
		
		setTimeout(function() {
			w.layout.resizeAll(); // now that the editor is loaded, set proper sizing
		}, 250);
		
		// load a starting document
		w.fm.loadInitialDocument(window.location.hash);
	};
	
	var _findDeletedTags = function() {
		for (var id in w.entities) {
			var nodes = w.editor.dom.select('span[name="'+id+'"]');
			switch (nodes.length) {
				case 0:
					w.entitiesList.remove(id);
					w.deletedEntities[id] = w.entities[id];
					delete w.entities[id];
					break;
				case 1:
					w.editor.dom.remove(nodes[0]);
					w.entitiesList.remove(id);
					w.deletedEntities[id] = w.entities[id];
					delete w.entities[id];
			}
		}
		for (var id in w.structs) {
			var nodes = w.editor.dom.select('#'+id);
			if (nodes.length == 0) {
				w.deletedStructs[id] = w.structs[id];
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
	
	var _onKeyUpHandler = function(ed, evt) {	
		// nav keys check
		if (evt.which >= 33 || evt.which <= 40) {
			_doHighlightCheck(ed, evt);
		}
		
		// update current entity
		if (ed.currentEntity) {
			var content = ed.$('#entityHighlight').text();
			var entity = w.entities[ed.currentEntity];
			entity.content = content;
			entity.title = w.u.getTitleFromContent(content);
			$('#entities li[name="'+ed.currentEntity+'"] > span[class="entityTitle"]').html(entity.title);
		}
		
		if (w.fixEmptyTag) {
			w.fixEmptyTag = false;
			ed.$('[class="empty_tag_remove_me"]').remove();
		}
		
		if (w.emptyTagId) {
			// alphanumeric keys
			if (evt.which >= 48 || evt.which <= 90) {
				var range = ed.selection.getRng(true);
				range.setStart(range.commonAncestorContainer, range.startOffset-1);
				range.setEnd(range.commonAncestorContainer, range.startOffset+1);
				w.insertBoundaryTags(w.emptyTagId, w.entities[w.emptyTagId].props.type, range);
				
				// TODO get working in IE
				var tags = ed.$('[name='+w.emptyTagId+']');
				range = ed.selection.getRng(true);
				range.setStartAfter(tags[0]);
				range.setEndBefore(tags[1]);
				range.collapse(false);
				
				w.entitiesList.update();
			} else {
				delete w.entities[w.emptyTagId];
			}
			w.emptyTagId = null;
		}
		
		if (ed.currentNode) {
			// check if text is allowed in this node
			if (ed.currentNode.getAttribute('_textallowed') == 'false') {
				w.d.show('message', {
					title: 'No Text Allowed',
					msg: 'Text is not allowed in the current tag: '+ed.currentNode.getAttribute('_tag')+'.',
					type: 'error'
				});
				
				// remove all text
				$(ed.currentNode).contents().filter(function() {
					return this.nodeType == 3;
				}).remove();
			}
			
			// replace br's inserted on shift+enter
			if (evt.shiftKey && evt.which == 13) {
				var node = ed.currentNode;
				if (ed.$(node).attr('_tag') == 'lb') node = node.parentNode;
				ed.$(node).find('br').replaceWith('<span _tag="lb"></span>');
			}
		}
		
		// delete keys check
		// need to do this here instead of in onchangehandler because that one doesn't update often enough
		if (evt.which == 8 || evt.which == 46) {
			_findDeletedTags();
			w.tree.update();
		}
	};
	
	var _onChangeHandler = function(ed, event) {
		if (ed.isDirty()) {
			ed.$('br').remove();
			_findDeletedTags();
			w.tree.update();
		}
	};
	
	var _onNodeChangeHandler = function(ed, cm, e) {
		if (e.nodeType != 1) {
			var root = ed.$(w.root, ed.getBody());
			ed.currentNode = root[0];
		} else {
			if (e.getAttribute('_tag') == null && e.nodeName != w.root) {
				e = e.parentNode;
				_onNodeChangeHandler(ed, cm, e);
			} else {
				ed.currentNode = e;
			}
		}
		if (ed.currentNode) {
			w.tree.selectNode(ed.currentNode.id);
		}
		if (w.emptyTagId) {
			delete w.entities[w.emptyTagId];
			w.emptyTagId = null;
		}
	};
	
	var _onPasteHandler = function(ed, event) {
		window.setTimeout(function() {
			_findDuplicateTags();
			w.entitiesList.update();
			w.tree.update();
		}, 0);
	};
	
	var _hideContextMenus = function(evt) {
		var target = $(evt.target);
		// hide structure tree menu
		if ($.vakata.context.vis && target.parents('#vakata-contextmenu').length == 0) {
			$.vakata.context.hide();
		}
		// hide editor menu
		if ($('#menu_editor_contextmenu:visible').length > 0 && target.parents('#menu_editor_contextmenu').length == 0) {
			w.editor.execCommand('hideContextMenu', w.editor, evt);
		}
	};
	
	var _doHighlightCheck = function(ed, evt) {
		var range = ed.selection.getRng(true);
		
		var entityStart = _findEntityBoundary('start', range.startContainer);
		var entityEnd = _findEntityBoundary('end', range.endContainer);
		
		if (entityEnd == null || entityStart == null) {
			w.highlightEntity();
			var parentNode = ed.$(ed.selection.getNode());
			if (parentNode.attr('_tag')) {
				var id = parentNode.attr('id');
				w.editor.currentStruct = id;
			}
			return;
		}
		
		var id = entityStart.getAttribute('name');
		if (id == ed.currentEntity) return;
		
		w.highlightEntity(id, ed.selection.getBookmark());
	};
	
	/**
	 * Get the entity boundary tag that corresponds to the passed tag.
	 * @param tag
	 */
	w.getCorrespondingEntityTag = function(tag) {
		tag = $(tag);
		var corrTag;
		if (tag.hasClass('start')) {
			corrTag = _findEntityBoundary('end', tag[0].nextSibling);
		} else {
			corrTag = _findEntityBoundary('start', tag[0].previousSibling);
		}
		return corrTag;
	};
	
	/**
	 * Searches for an entity boundary containing the current node.
	 * @param boundaryType Either 'start' or 'end'.
	 * @param currentNode The node that is currently being examined.
	 */
	var _findEntityBoundary = function(boundaryType, currentNode) {
		
		/**
		 * @param entIds An array of entity ids that are encountered.  Used to prevent false positives.
		 * @param levels An array to track the levels of node depth in order to prevent endless recursion.
		 * @param structIds An object to track the node ids that we've already encountered.
		 */
		function doFind(boundaryType, currentNode, entIds, levels, structIds) {
			if (currentNode.id) {
				if (structIds[currentNode.id]) {
					return null;
				} else {
					structIds[currentNode.id] = true;
				}
			}
			
			if (w.editor.dom.hasClass(currentNode, 'entity')) {
				var nodeId = currentNode.getAttribute('name');
				if (w.editor.dom.hasClass(currentNode, boundaryType)) {
					if (entIds.indexOf(nodeId) == -1) {
						return currentNode;
					} else if (entIds[0] == nodeId) {
						entIds.shift();
					}
				} else {
					entIds.push(nodeId);
				}
			}
			
			if (boundaryType == 'start' && currentNode.lastChild) {
				levels.push(currentNode);
				return doFind(boundaryType, currentNode.lastChild, entIds, levels, structIds);
			} else if (boundaryType == 'end' && currentNode.firstChild) {
				levels.push(currentNode);
				return doFind(boundaryType, currentNode.firstChild, entIds, levels, structIds);
			}
			
			if (boundaryType == 'start' && currentNode.previousSibling) {
				return doFind(boundaryType, currentNode.previousSibling, entIds, levels, structIds);
			} else if (boundaryType == 'end' && currentNode.nextSibling) {
				return doFind(boundaryType, currentNode.nextSibling, entIds, levels, structIds);
			}
			
			if (currentNode.parentNode) {
				if (currentNode.parentNode == levels[levels.length-1]) {
					levels.pop();
					if (boundaryType == 'start' && currentNode.parentNode.previousSibling) {
						return doFind(boundaryType, currentNode.parentNode.previousSibling, entIds, levels, structIds);
					} else if (boundaryType == 'end' && currentNode.parentNode.nextSibling) {
						return doFind(boundaryType, currentNode.parentNode.nextSibling, entIds, levels, structIds);
					} else return null;
				} else {
					return doFind(boundaryType, currentNode.parentNode, entIds, levels, structIds);
				}
			}
			
			return null;
		};
		
		var match = doFind(boundaryType, currentNode, [], [currentNode.parentNode], {});
		return match;
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
	
	w.showError = function(errorType) {
		switch(errorType) {
		case w.NO_SELECTION:
			w.d.show('message', {
				title: 'Error',
				msg: 'Please select some text before adding an entity or tag.',
				type: 'error'
			});
			break;
		case w.NO_COMMON_PARENT:
			w.d.show('message', {
				title: 'Error',
				msg: 'Please ensure that the beginning and end of your selection have a common parent.<br/>For example, your selection cannot begin in one paragraph and end in another, or begin in bolded text and end outside of that text.',
				type: 'error'
			});
		}
	};
	
	w.addEntity = function(type) {
		var result = w.u.isSelectionValid();
		if (result == w.VALID) {
			w.editor.currentBookmark = w.editor.selection.getBookmark(1);
			w.d.show(type, {type: type, title: w.em.getTitle(type), pos: w.editor.contextMenuPos});
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
		
		var title = w.u.getTitleFromContent(content);
		
		var id = tinymce.DOM.uniqueId('ent_');
		w.editor.currentEntity = id;
		
		w.entities[id] = {
			props: {
				id: id,
				type: type,
				title: title,
				content: content
			},
			info: {}
		};
		
		if (content != '') {
			w.insertBoundaryTags(id, type, range);
		} else {
			w.emptyTagId = id;
		}
		
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
	
	w.finalizeEntity = function(type, info) {
		w.editor.selection.moveToBookmark(w.editor.currentBookmark);
		if (info != null) {
//			var startTag = w.editor.$('[name='+id+'][class~=start]');
//			for (var key in info) {
//				startTag.attr(key, w.u.escapeHTMLString(info[key]));
//			}
			var id = _addEntityTag(type);
			w.entities[id].info = info;
			w.entitiesList.update();
			w.highlightEntity(id);
		}
		w.editor.currentBookmark = null;
		w.editor.focus();
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
			if (w.editor.$(tag.struct).attr('_tag')) {
				w.editor.execCommand('editSchemaTag', tag.struct, pos);
			} else {
				w.editor.execCommand('editCustomTag', tag.struct, pos);
			}
		} else if (tag.entity) {
			var type = tag.entity.props.type;
			w.d.show(type, {type: type, title: w.em.getTitle(type), pos: pos, entry: tag.entity});
		}
	};
	
	// a general change/replace function
	w.changeTag = function(params) {
		var tag = _getCurrentTag(params.id);
		if (tag.struct) {
			if (w.editor.$(tag.struct).attr('_tag')) {
				w.editor.execCommand('changeSchemaTag', {tag: tag.struct, pos: params.pos, key: params.key});
			}
		} else if (tag.entity) {
		}
	};
	
	w.editEntity = function(id, info) {
		w.entities[id].info = info;
		w.entitiesList.update();
		w.highlightEntity(id);
	};
	
	w.copyEntity = function(id, pos) {
		var tag = _getCurrentTag(id);
		if (tag.entity) {
			w.editor.entityCopy = tag.entity;
		} else {
			w.d.show('message', {
				title: 'Error',
				msg: 'Cannot copy structural tags.',
				type: 'error'
			});
		}
	};
	
	w.pasteEntity = function(pos) {
		if (w.editor.entityCopy == null) {
			w.d.show('message', {
				title: 'Error',
				msg: 'No entity to copy!',
				type: 'error'
			});
		} else {
			var newEntity = jQuery.extend(true, {}, w.editor.entityCopy);
			newEntity.props.id = tinymce.DOM.uniqueId('ent_');
			
			w.editor.selection.moveToBookmark(w.editor.currentBookmark);
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
		w.editor.currentEntity = null;
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
	
	w.addStructureTag = function(params) {
		var bookmark = params.bookmark;
		var attributes = params.attributes;
		var action = params.action;
		
		var id = tinymce.DOM.uniqueId('struct_');
		attributes.id = id;
		attributes._textallowed = w.u.canTagContainText(attributes._tag);
		w.structs[id] = attributes;
		w.editor.currentStruct = id;
		
		var node = bookmark.rng.commonAncestorContainer;
		while (node.nodeType == 3) {
			node = node.parentNode;
		}
		
		var tag = 'span';
		var open_tag = '<'+tag;
		for (var key in attributes) {
			if (key == 'id' || key.match(/^_/) != null) {
				open_tag += ' '+key+'="'+attributes[key]+'"';
			}
		}
		open_tag += '>';
		var close_tag = '</'+tag+'>';
		
		var selection = '<span class="empty_tag_remove_me"></span>';
		var content = open_tag + selection + close_tag;
		if (action == 'before') {
			$(node).before(content);
		} else if (action == 'after') {
			$(node).after(content);
		} else if (action == 'around') {
			$(node).wrap(content);
		} else if (action == 'inside') {
			$(node).wrapInner(content);
		} else {
			w.editor.selection.moveToBookmark(bookmark);
			selection = w.editor.selection.getContent();
			if (selection == '') selection = '<span class="empty_tag_remove_me"></span>';

			content = open_tag + selection + close_tag;
			w.editor.execCommand('mceReplaceContent', false, content);
		}
		if (selection == '<span class="empty_tag_remove_me"></span>') {
			// TODO inserting empty struct isn't working
			w.fixEmptyTag = true;
			var nodeEl = w.editor.$('span[class="empty_tag_remove_me"]').parent()[0];
			var range = w.editor.selection.getRng(true);
			range.setStart(nodeEl.firstChild, 0);
			range.setEnd(nodeEl.lastChild, nodeEl.lastChild.length);
			w.editor.getDoc().getSelection().addRange(range);
		}
		
		w.tree.update();
	};
	
	w.editStructureTag = function(tag, attributes) {
		var id = tag.attr('id');
		attributes.id = id;
		$.each($(tag[0].attributes), function(index, att) {
			if (att.name != 'id') {
				tag.removeAttr(att.name);
			}
		});
		for (var key in attributes) {
			if (key.match(/^_/) != null) {
				tag.attr(key, attributes[key]);
			}
		}
		w.structs[id] = attributes;
		w.tree.update();
	};
	
	w.removeStructureTag = function(id, removeContents) {
		id = id || w.editor.currentStruct;
		
		delete w.structs[id];
		var node = w.editor.$('#'+id);
		if (removeContents) {
			node.remove();
		} else {
			var parent = node.parent()[0];
			var contents = node.contents();
			if (contents.length > 0) {
				contents.unwrap();
			} else {
				node.remove();
			}
			parent.normalize();
		}
		w.tree.update();
		w.editor.currentStruct = null;
	};
	
	w.selectStructureTag = function(id) {
		w.editor.currentStruct = id;
		var node = w.editor.$('#'+id);
		var nodeEl = node[0];
		
		w.fixEmptyTag = true;
		node.append('<span class="empty_tag_remove_me"></span>');
		
		if (tinymce.isWebKit) {
			w.editor.getWin().getSelection().selectAllChildren(nodeEl);
		} else {
			var range = w.editor.selection.getRng(true);
			range.setStart(nodeEl.firstChild, 0);
			range.setEnd(nodeEl.lastChild, nodeEl.lastChild.length);
			w.editor.getWin().getSelection().addRange(range);
		}		
		
		// fire the onNodeChange event
		w.editor.parents = [];
		w.editor.dom.getParent(nodeEl, function(n) {
			if (n.nodeName == 'BODY')
				return true;

			w.editor.parents.push(n);
		});
		w.editor.onNodeChange.dispatch(w.editor, w.editor.controlManager, nodeEl, false, w.editor);
		
		w.editor.focus();
	};
	
	w.removeHighlights = function() {
		w.highlightEntity();
	};
	
	w.getDocumentationForTag = function(tag) {
		var element = $('element[name="'+tag+'"]', writer.schemaXML);
		var doc = $('a\\:documentation, documentation', element).first().text();
		return doc;
	};
	
	/**
	 * Begin init functions
	 */
	w.init = function() {
		var cssFiles = ['css/style.css', 'smoothness/jquery-ui-1.9.0.custom.css', 'css/layout-default-latest.css', 'js/snippet/jquery.snippet.css'];
		for (var i = 0; i < cssFiles.length; i++) {
			var css = $('<link />');
			css.attr({
				rel: 'stylesheet',
				type: 'text/css',
				href: cssFiles[i]
			});
			$(document.head).append(css);
		}
		
		var title = 'CWRC-Writer v0.3';
		$(document.body).append(''+
			'<div id="header" class="ui-layout-north"><h1>'+title+'</h1></div>'+
			'<div class="ui-layout-west"><div id="westTabs" class="tabs"><ul><li><a href="#entities">Entities</a></li><li><a href="#structure">Structure</a></li><li><a href="#relations">Relations</a></li></ul><div id="westTabsContent" class="ui-layout-content"></div></div></div>'+
			'<div id="main" class="ui-layout-center">'+
				'<div class="ui-layout-center"><form method="post" action=""><textarea id="editor" name="editor" class="tinymce"></textarea></form></div>'+
				'<div class="ui-layout-south"><div id="southTabs" class="tabs"><ul><li><a href="#validation">Validation</a></li></ul><div id="southTabsContent" class="ui-layout-content"></div></div></div>'+
			'</div>');		
		
		w.layout = $(document.body).layout({
			defaults: {
				maskIframesOnResize: true,
				resizable: true,
				slidable: false
			},
			north: {
				size: 27,
				resizable: false,
				spacing_open: 0,
				spacing_closed: 0
			},
			west: {
				size: 'auto',
				minSize: 230,
				onresize: function(region, pane, state, options) {
					var tabsHeight = $('#westTabs > ul').outerHeight();
					$('#westTabsContent').height(state.layoutHeight - tabsHeight);
				}
			}
		});
		w.layout.panes.center.layout({
			defaults: {
				maskIframesOnResize: true,
				resizable: true,
				slidable: false
			},
			center: {
				onresize: function(region, pane, state, options) {
					var uiHeight = $('#'+w.editor.id+'_tbl tr.mceFirst').outerHeight() + 2;
					$('#'+w.editor.id+'_ifr').height(state.layoutHeight - uiHeight);
				}
			},
			south: {
				size: 250,
				initClosed: true,
				onopen_start: function(region, pane, state, options) {
					var southTabs = $('#southTabs');
					if (!southTabs.hasClass('ui-tabs')) {
						southTabs.tabs({
							create: function(event, ui) {
								southTabs.parent().find('div.ui-corner-all, ul.ui-corner-all').removeClass('ui-corner-all');
							}
						});
					}
				},
				onresize: function(region, pane, state, options) {
					var tabsHeight = $('#southTabs > ul').outerHeight();
					$('#southTabsContent').height(state.layoutHeight - tabsHeight);
				}
			}
		});
		
		$('#header h1').click(function() {
			window.location = 'index.htm';
		});
		
		if (w.mode != null && w.mode == 'xml') {
			w.mode = w.XML;
		} else {
			w.mode = w.XMLRDF;
		}
		
		w.d = new DialogManager({writer: w});
		w.u = new Utilities({writer: w});
		w.fm = new FileManager({writer: w});
		w.tree = new StructureTree({writer: w, parentId: '#westTabsContent'});
		w.entitiesList = new EntitiesList({writer: w, parentId: '#westTabsContent'});
		w.em = new EntitiesModel();
		w.relations = new Relations({writer: w, parentId: '#westTabsContent'});
		w.validation = new Validation({writer: w, parentId: '#southTabsContent'});
		w.settings = new SettingsDialog(w, {
			showEntityBrackets: true,
			showStructBrackets: false
		});
		
		$(document.body).click(_hideContextMenus);
		$('#westTabs').tabs({
			create: function(event, ui) {
				$('#westTabs').parent().find('.ui-corner-all').removeClass('ui-corner-all');
			}
		});
		
		w._initEditor();
	};
	
	w._initEditor = function() {		
		$('#editor').tinymce({
			script_url : 'js/tinymce/jscripts/tiny_mce/tiny_mce.js',
//		tinyMCE.init({
//			mode: 'exact',
//			elements: 'editor',
			theme: 'advanced',
			
			content_css: 'css/editor.css',
			
			width: '100%',
			
			contextmenu_never_use_native: true,
			
			doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
			element_format: 'xhtml',
			
			forced_root_block: w.root,
			keep_styles: false, // false, otherwise tinymce interprets our spans as style elements
			
			paste_auto_cleanup_on_paste: true,
			paste_postprocess: function(pl, o) {
				function stripTags(index, node) {
					if (node.nodeName.toLowerCase() != 'p' && node.nodeName.toLowerCase() != 'br') {
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
				
				function replaceTags(index, node) {
					if (node.nodeName.toLowerCase() == 'p') {
						$(node).contents().unwrap().wrapAll('<span _tag="p"></span>').not(':text').each(replaceTags);
					} else if (node.nodeName.toLowerCase() == 'br') {
						$(node).replaceWith('<span _tag="lb"></span>');
					}
				}
				
				$(o.node).children().each(stripTags);
				$(o.node).children().each(replaceTags);
			},
			
			valid_elements: '*[*]', // allow everything
			
			plugins: 'paste,-entitycontextmenu,-schematags,-currenttag,-viewsource',
			theme_advanced_buttons1: 'schematags,|,addperson,addplace,adddate,addevent,addorg,addcitation,addnote,addtitle,addcorrection,addkeyword,addlink,|,editTag,removeTag,|,addtriple,|,viewsource,editsource,|,validate,newbutton,savebutton,saveasbutton,loadbutton',
			theme_advanced_buttons2: 'currenttag',
			theme_advanced_buttons3: '',
			theme_advanced_toolbar_location: 'top',
			theme_advanced_toolbar_align: 'left',
			theme_advanced_path: false,
			theme_advanced_statusbar_location: 'none',
			
			setup: function(ed) {
				// link the writer and editor
				w.editor = ed;
				ed.writer = w;
				
				// custom properties added to the editor
				ed.currentEntity = null; // the id of the currently highlighted entity
				ed.currentStruct = null; // the id of the currently selected structural tag
				ed.currentBookmark = null; // for storing a bookmark used when adding a tag
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
				
				// add custom plugins and buttons
				var plugins = ['schematags','currenttag','entitycontextmenu','viewsource','scrolling_dropmenu'];
				
				for (var i = 0; i < plugins.length; i++) {
					var name = plugins[i];
					tinymce.PluginManager.load(name, '../../../tinymce_plugins/'+name+'.js');
				}
				
				ed.addButton('addperson', {title: 'Tag Person', image: 'img/user.png', 'class': 'entityButton person',
					onclick : function() {
						ed.execCommand('addEntity', 'person');
					}
				});
				ed.addButton('addplace', {title: 'Tag Place', image: 'img/world.png', 'class': 'entityButton place',
					onclick : function() {
						ed.execCommand('addEntity', 'place');
					}
				});
				ed.addButton('adddate', {title: 'Tag Date', image: 'img/calendar.png', 'class': 'entityButton date',
					onclick : function() {
						ed.execCommand('addEntity', 'date');
					}
				});
				ed.addButton('addevent', {title: 'Tag Event', image: 'img/cake.png', 'class': 'entityButton event',
					onclick : function() {
						ed.execCommand('addEntity', 'event');
					}
				});
				ed.addButton('addorg', {title: 'Tag Organization', image: 'img/group.png', 'class': 'entityButton org',
					onclick : function() {
						ed.execCommand('addEntity', 'org');
					}
				});
				ed.addButton('addcitation', {title: 'Tag Citation', image: 'img/vcard.png', 'class': 'entityButton citation',
					onclick : function() {
						ed.execCommand('addEntity', 'citation');
					}
				});
				ed.addButton('addnote', {title: 'Tag Note', image: 'img/note.png', 'class': 'entityButton note',
					onclick : function() {
						ed.execCommand('addEntity', 'note');
					}
				});
				ed.addButton('addcorrection', {title: 'Tag Correction', image: 'img/error.png', 'class': 'entityButton correction',
					onclick : function() {
						ed.execCommand('addEntity', 'correction');
					}
				});
				ed.addButton('addkeyword', {title: 'Tag Keyword', image: 'img/page_key.png', 'class': 'entityButton keyword',
					onclick : function() {
						ed.execCommand('addEntity', 'keyword');
					}
				});
				ed.addButton('addlink', {title: 'Tag Link', image: 'img/link.png', 'class': 'entityButton link',
					onclick : function() {
						ed.execCommand('addEntity', 'link');
					}
				});
				ed.addButton('addtitle', {title: 'Tag Text/Title', image: 'img/book.png', 'class': 'entityButton textTitle',
					onclick : function() {
						ed.execCommand('addEntity', 'title');
					}
				});
				ed.addButton('editTag', {title: 'Edit Tag', image: 'img/tag_blue_edit.png', 'class': 'entityButton',
					onclick : function() {
						ed.execCommand('editTag');
					}
				});
				ed.addButton('removeTag', {title: 'Remove Tag', image: 'img/tag_blue_delete.png', 'class': 'entityButton',
					onclick : function() {
						ed.execCommand('removeTag');
					}
				});
				ed.addButton('newbutton', {title: 'New', image: 'img/page_white_text.png', 'class': 'entityButton',
					onclick: function() {
						w.fm.newDocument();
					}
				});
				ed.addButton('savebutton', {title: 'Save', image: 'img/save.png',
					onclick: function() {
						w.fm.validate(true);
					}
				});
				ed.addButton('saveasbutton', {title: 'Save As', image: 'img/save_as.png',
					onclick: function() {
						w.fm.openSaver();
					}
				});
				ed.addButton('loadbutton', {title: 'Load', image: 'img/folder_page.png', 'class': 'entityButton',
					onclick: function() {
						w.fm.openLoader();
					}
				});
				ed.addButton('editsource', {title: 'Edit Source', image: 'img/editsource.gif', 'class': 'wideButton',
					onclick: function() {
						w.fm.editSource();
					}
				});
				ed.addButton('validate', {title: 'Validate', image: 'img/validate.png', 'class': 'entityButton',
					onclick: function() {
						w.fm.validate();
					}
				});
				ed.addButton('addtriple', {title: 'Add Relation', image: 'img/chart_org.png', 'class': 'entityButton',
					onclick: function() {
						$('#westTabs').tabs('select', 2);
						w.d.show('triple');
					}
				});
				
//				ed.addButton('toggleeditor', {
//					title: 'Show Advanced Mode',
//					image: 'img/html.png',
//					'class': 'entityButton',
//					cmd: 'toggle_editor'
//				});
			}
		});
	};
	
	return w;
};var AddEventDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
	'<div id="addEventDialog">'+
		'<div>'+
		'<label>Event Name</label>'+
		'<input type="text" name="eventname" value=""/>'+
		'</div>'+
		'<div style="float: right; width: 100px;">'+
		'<input type="radio" name="addDateType" value="date" id="add_type_date" checked="checked"/><label for="add_type_date">Date</label><br/>'+
		'<input type="radio" name="addDateType" value="range" id="add_type_range"/><label for="add_type_range">Date Range</label>'+
		'</div>'+
		'<div id="addDate">'+
		'<label for="addDatePicker">Date</label><input type="text" id="addDatePicker" />'+
		'</div>'+
		'<div id="addRange">'+
		'<label for="addStartDate">Start Date</label><input type="text" id="addStartDate" style="margin-bottom: 5px;"/><br />'+
	    '<label for="addEndDate">End Date</label><input type="text" id="addEndDate" />'+
	    '</div>'+
	    '<p>Format: yyyy or yyyy-mm-dd<br/>e.g. 2010, 2010-10-05</p>'+
	    '<button>Add Further Information</button>'+
	    '<p>Note: for DEMO purposes only. Saves are NOT permanent.'+
	'</div>');
	
	var d = $('#addEventDialog');
	d.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#addEventDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		title: 'Create New Event',
		height: 300,
		width: 400,
		autoOpen: false,
		buttons: {
			'Submit for Review': function() {
				alert('New records can\'t be added yet. The popup is here only to solicit feedback.');
				d.dialog('close');
			},
			'Cancel': function() {
				d.dialog('close');
			}
		}
	});
	
	$('#addEventDialog > button').button();
	
	var dateInput = $('#addDatePicker')[0];
	$(dateInput).focus(function() {
		$(this).css({borderBottom: ''});
	});
	
	$('#addEventDialog input[name="addDateType"]').change(function() {
		var type = this.id.split('_')[2];
		toggleDate(type);
	});
	
	$('#addEventDialog input').keyup(function(event) {
		if (event.keyCode == '13') {
			event.preventDefault();
//			dateResult();
		}
	});
	
	$('#addDatePicker').datepicker({
		dateFormat: 'yy-mm-dd',
		constrainInput: false,
		changeMonth: true,
		changeYear: true,
		yearRange: '-210:+10',
		minDate: new Date(1800, 0, 1),
		maxDate: new Date(2020, 11, 31),
		showOn: 'button',
		buttonText: 'Date Picker',
		buttonImage: 'img/calendar.png',
		buttonImageOnly: true
	});
	
	var startDate = $('#addStartDate')[0];
	$(startDate).focus(function() {
		$(this).css({borderBottom: ''});
	});
	var endDate = $('#addEndDate')[0];
	$(endDate).focus(function() {
		$(this).css({borderBottom: ''});
	});
	
	var dateRange = $('#addStartDate, #addEndDate').datepicker({
		dateFormat: 'yy-mm-dd',
		constrainInput: false,
		changeMonth: true,
		changeYear: true,
		yearRange: '-210:+10',
		minDate: new Date(1800, 0, 1),
		maxDate: new Date(2020, 11, 31),
		showOn: 'button',
		buttonText: 'Date Picker',
		buttonImage: 'img/calendar.png',
		buttonImageOnly: true,
		onSelect: function(selectedDate) {
			var option = this.id == "startDate" ? "minDate" : "maxDate";
			var instance = $(this).data("datepicker");
			var date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);
			dateRange.not(this).datepicker("option", option, date);
		}
	});
	
	var toggleDate = function(type) {
		if (type == 'date') {
			$('#addDate').show();
			$('#addRange').hide();
		} else {
			$('#addDate').hide();
			$('#addRange').show();
		}
	};
	
	var dateResult = function(cancelled) {
		var data = {};
		if (!cancelled) {
			var type = $('#addEventDialog input[name="addDateType"]:checked', date).val();
			if (type == 'date') {
				var dateString = dateInput.value;
				if (dateString.match(/^\d{4}-\d{2}-\d{2}$/) || dateString.match(/^\d{4}$/)) {
					data.date = dateString;
				} else {
					$(dateInput).css({borderBottom: '1px solid red'});
					return false;
				}
			} else {
				var startString = startDate.value;
				var endString = endDate.value;
				var error = false;
				var padStart = '';
				var padEnd = '';
				
				if (startString.match(/^\d{4}-\d{2}-\d{2}$/)) {
					data.startDate = startString;
				} else if (startString.match(/^\d{4}$/)) {
					data.startDate = startString;
					padStart = '-01-01';
				} else {
					$(startDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				if (endString.match(/^\d{4}-\d{2}-\d{2}$/)) {
					data.endDate = endString;
				} else if (endString.match(/^\d{4}$/)) {
					data.endDate = endString;
					padEnd = '-01-01';
				} else {
					$(endDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				var start = $.datepicker.parseDate('yy-mm-dd', startString+padStart);
				var end = $.datepicker.parseDate('yy-mm-dd', endString+padEnd);
				
				if (start > end) {
					$(startDate).css({borderBottom: '1px solid red'});
					$(endDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				if (error) return false;
			}
		} else {
			data = null;
		}
		
		d.dialog('close');
	};
	
	return {
		show: function(config) {
			toggleDate('date');
			$('#add_type_date').attr('checked', true);
			
			$(dateInput).css({borderBottom: ''});
			$(startDate).css({borderBottom: ''});
			$(endDate).css({borderBottom: ''});
			
			$('#addEventDialog input').val('');
			d.dialog('open');
		},
		hide: function() {
			d.dialog('close');
		}
	};
};var AddOrganizationDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
	'<div id="addOrganizationDialog">'+
		'<div>'+
		'<label>Organization Name</label>'+
		'<input type="text" name="placename" value=""/>'+
		'</div>'+
		'<div>'+
		'<label>Type</label>'+
		'<select name="type">'+
		'<option value="">Corporation</option>'+
		'<option value="">Government</option>'+
		'<option value="">Non-governmental</option>'+
		'<option value="">International</option>'+
		'<option value="">Charity</option>'+
		'<option value="">Not-for-profit corporation</option>'+
		'<option value="">Cooperative</option>'+
		'<option value="">University</option>'+
		'</select>'+
		'</div>'+
	    '<button>Add Further Information</button>'+
	    '<p>Note: for DEMO purposes only. Saves are NOT permanent.'+
	'</div>');
	
	var d = $('#addOrganizationDialog');
	d.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#addOrganizationDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		title: 'Create New Organization',
		height: 300,
		width: 400,
		autoOpen: false,
		buttons: {
			'Submit for Review': function() {
				alert('New records can\'t be added yet. The popup is here only to solicit feedback.');
				d.dialog('close');
			},
			'Cancel': function() {
				d.dialog('close');
			}
		}
	});
	
	$('#addOrganizationDialog > button').button();
	
	return {
		show: function(config) {
			$('#addOrganizationDialog input').val('');
			d.dialog('open');
		},
		hide: function() {
			d.dialog('close');
		}
	};
};var AddPersonDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
	'<div id="addPersonDialog">'+
		'<div id="personName">'+
		'<label>Name</label>'+
		'<input type="text" name="first" value=""/>'+
		'<input type="text" name="middle" value=""/>'+
		'<input type="text" name="maiden" value=""/>'+
		'<input type="text" name="last" value=""/>'+
		'</div>'+
		'<div>'+
		'<label for="dob">Date of Birth (if known)</label><input type="text" id="dob" style="margin-bottom: 5px;"/><br />'+
	    '<label for="dod">Date of Death (if known)</label><input type="text" id="dod" />'+
	    '<p>Format: yyyy-mm-dd<br/>e.g. 2010-10-05</p>'+
	    '</div>'+
	    '<div>'+
	    '<label>Occupation (if known)</label><select name="occupation">'+
	    '<option></option>'+
	    '<option>Author</option>'+
	    '<option>Teacher</option>'+
	    '<option>Engineer</option>'+
	    '</select>'+
	    '</div>'+
	    '<button>Add Further Information</button>'+
	    '<p>Note: for DEMO purposes only. Saves are NOT permanent.'+
	'</div>');
	
	var addPerson = $('#addPersonDialog');
	addPerson.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#addPersonDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		title: 'Create New Person',
		height: 350,
		width: 465,
		autoOpen: false,
		buttons: {
			'Submit for Review': function() {
				alert('New records can\'t be added yet. The popup is here only to solicit feedback.');
				addPerson.dialog('close');
			},
			'Cancel': function() {
				addPerson.dialog('close');
			}
		}
	});
	
	var lifeSpan = $('#dob, #dod').datepicker({
		dateFormat: 'yy-mm-dd',
		constrainInput: false,
		changeMonth: true,
		changeYear: true,
		yearRange: '-210:+10',
		minDate: new Date(1800, 0, 1),
		maxDate: new Date(2020, 11, 31),
		showOn: 'button',
		buttonText: 'Date Picker',
		buttonImage: 'img/calendar.png',
		buttonImageOnly: true,
		onSelect: function(selectedDate) {
			var option = this.id == "dob" ? "minDate" : "maxDate";
			var instance = $(this).data("datepicker");
			var date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);
			dateRange.not(this).datepicker("option", option, date);
		}
	});
	
	$('#addPersonDialog input[name="first"]').watermark('First');
	$('#addPersonDialog input[name="middle"]').watermark('Middle');
	$('#addPersonDialog input[name="maiden"]').watermark('Maiden');
	$('#addPersonDialog input[name="last"]').watermark('Last');
	
	$('#addPersonDialog > button').button();
	
	return {
		show: function(config) {
			$('#addPersonDialog input').val('');
			$('#addPersonDialog select').val('');
			addPerson.dialog('open');
		},
		hide: function() {
			addPerson.dialog('close');
		}
	};
};var AddPlaceDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
	'<div id="addPlaceDialog">'+
		'<div>'+
		'<label>Place Name</label>'+
		'<input type="text" name="placename" value=""/>'+
		'</div>'+
		'<div>'+
		'<label>Location</label>'+
		'<input type="text" name="location" value=""/>'+
		'</div>'+
	    '<button>Add Further Information</button>'+
	    '<p>Note: for DEMO purposes only. Saves are NOT permanent.'+
	'</div>');
	
	var d = $('#addPlaceDialog');
	d.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#addPlaceDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		title: 'Create New Place',
		height: 300,
		width: 400,
		autoOpen: false,
		buttons: {
			'Submit for Review': function() {
				alert('New records can\'t be added yet. The popup is here only to solicit feedback.');
				d.dialog('close');
			},
			'Cancel': function() {
				d.dialog('close');
			}
		}
	});
	
	$('#addPlaceDialog > button').button();
	
	return {
		show: function(config) {
			$('#addPlaceDialog input').val('');
			d.dialog('open');
		},
		hide: function() {
			d.dialog('close');
		}
	};
};var CitationDialog = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="citationDialog">'+
	    '<textarea name="citation" style="margin-top: 10px;"></textarea>'+
	'</div>');
	
	var citation = $('#citationDialog');
	citation.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#citationDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 225,
		width: 380,
		autoOpen: false,
		buttons: {
			'Tag Citation': function() {
				citationResult();
			},
			'Cancel': function() {
				citationResult(true);
			}
		}
	});
	var citationInput = $('#citationDialog textarea')[0];
	
	var citationResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			data = {};
			data[currentType] = citationInput.value;
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		citation.dialog('close');
		currentType = null;
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Add ';
			
			if (mode == ADD) {
				citationInput.value = '';
			} else {
				prefix = 'Edit ';
				citationInput.value = config.entry.info[currentType];
			}
			
			var title = prefix+config.title;
			citation.dialog('option', 'title', title);
			if (config.pos) {
				citation.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				citation.dialog('option', 'position', 'center');
			}
			citation.dialog('open');
		},
		hide: function() {
			citation.dialog('close');
		}
	};
};var CorrectionDialog = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="correctionDialog">'+
	    '<div><p>Correction</p><textarea id="correctionInput" name="correction"></textarea></div>'+
	    '<div id="corr_cert"><p>Certainty</p>'+
	    '<input type="radio" id="corr_definite" name="certainty" value="definite" /><label for="corr_definite">Definite</label>'+
		'<input type="radio" id="corr_reasonable" name="certainty" value="reasonable" /><label for="corr_reasonable">Reasonably Certain</label>'+
		'<input type="radio" id="corr_probable" name="certainty" value="probable" /><label for="corr_probable">Probable</label>'+
		'<input type="radio" id="corr_speculative" name="certainty" value="speculative" /><label for="corr_speculative">Speculative</label>'+
		'</div>'+
		'<div id="corr_type"><p>Type</p>'+
		'<input type="radio" id="corr_ocr" name="type" value="ocr" /><label for="corr_ocr">OCR</label>'+
		'<input type="radio" id="corr_typo" name="type" value="typographical" /><label for="corr_typo">Typographical</label>'+
		'<input type="radio" id="corr_other" name="type" value="other" /><label for="corr_other">Other</label>'+
		'</div>'+
	'</div>');
	
	var correction = $('#correctionDialog');
	correction.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#correctionDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 355,
		width: 385,
		autoOpen: false,
		buttons: {
			'Tag Correction': function() {
				correctionResult();
			},
			'Cancel': function() {
				correctionResult(true);
			}
		}
	});
	var correctionInput = $('#correctionDialog textarea')[0];
	$('#corr_cert, #corr_type').buttonset();
	
	var correctionResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			data = {
				content: correctionInput.value,
				certainty: $('#corr_cert input:checked').val(),
				type: $('#corr_type input:checked').val()
			};
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		correction.dialog('close');
		currentType = null;
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Add ';
			
			if (mode == ADD) {
				correctionInput.value = '';
				$('#corr_cert input:eq(0)').click();
				$('#corr_type input:eq(0)').click();
			} else {
				prefix = 'Edit ';
				correctionInput.value = config.entry.info.content;
				$('#corr_cert input[value="'+config.entry.info.certainty+'"]').click();
				$('#corr_type input[value="'+config.entry.info.type+'"]').click();
			}
			
			var title = prefix+config.title;
			correction.dialog('option', 'title', title);
			if (config.pos) {
				correction.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				correction.dialog('option', 'position', 'center');
			}
			correction.dialog('open');
		},
		hide: function() {
			correction.dialog('close');
		}
	};
};var DateDialog = function(config) {
	var w = config.writer;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="dateDialog">'+
		'<div style="float: right; width: 100px;">'+
		'<input type="radio" name="dateType" value="date" id="type_date" checked="checked"/><label for="type_date">Date</label><br/>'+
		'<input type="radio" name="dateType" value="range" id="type_range"/><label for="type_range">Date Range</label>'+
		'</div>'+
		'<div id="date">'+
		'<label for="datePicker">Date</label><input type="text" id="datePicker" />'+
		'</div>'+
		'<div id="range">'+
		'<label for="startDate">Start Date</label><input type="text" id="startDate" style="margin-bottom: 5px;"/><br />'+
	    '<label for="endDate">End Date</label><input type="text" id="endDate" />'+
	    '</div>'+
	    '<p>Format: yyyy or yyyy-mm-dd<br/>e.g. 2010, 2010-10-05</p>'+
	'</div>');
	
	var date = $('#dateDialog');
	date.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#dateDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 200,
		width: 375,
		autoOpen: false,
		buttons: {
			'Tag Date': function() {
				dateResult();
			},
			'Cancel': function() {
				dateResult(true);
			}
		}
	});
	
	var dateInput = $('#datePicker')[0];
	$(dateInput).focus(function() {
		$(this).css({borderBottom: ''});
	});
	
	$('#dateDialog input[name="dateType"]').change(function() {
		var type = this.id.split('_')[1];
		toggleDate(type);
	});
	
	$('#dateDialog input').keyup(function(event) {
		if (event.keyCode == '13') {
			event.preventDefault();
			dateResult();
		}
	});
	
	$('#datePicker').datepicker({
		dateFormat: 'yy-mm-dd',
		constrainInput: false,
		changeMonth: true,
		changeYear: true,
		yearRange: '-210:+10',
		minDate: new Date(1800, 0, 1),
		maxDate: new Date(2020, 11, 31),
		showOn: 'button',
		buttonText: 'Date Picker',
		buttonImage: 'img/calendar.png',
		buttonImageOnly: true
	});
	
	var startDate = $('#startDate')[0];
	$(startDate).focus(function() {
		$(this).css({borderBottom: ''});
	});
	var endDate = $('#endDate')[0];
	$(endDate).focus(function() {
		$(this).css({borderBottom: ''});
	});
	
	var dateRange = $('#startDate, #endDate').datepicker({
		dateFormat: 'yy-mm-dd',
		constrainInput: false,
		changeMonth: true,
		changeYear: true,
		yearRange: '-210:+10',
		minDate: new Date(1800, 0, 1),
		maxDate: new Date(2020, 11, 31),
		showOn: 'button',
		buttonText: 'Date Picker',
		buttonImage: 'img/calendar.png',
		buttonImageOnly: true,
		onSelect: function(selectedDate) {
			var option = this.id == "startDate" ? "minDate" : "maxDate";
			var instance = $(this).data("datepicker");
			var date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);
			dateRange.not(this).datepicker("option", option, date);
		}
	});
	
	var toggleDate = function(type) {
		if (type == 'date') {
			$('#date').show();
			$('#range').hide();
		} else {
			$('#date').hide();
			$('#range').show();
		}
	};
	
	var dateResult = function(cancelled) {
		var data = {};
		if (!cancelled) {
			var type = $('#type_date:checked').val();
			if (type == 'date') {
				var dateString = dateInput.value;
				if (dateString.match(/^\d{4}-\d{2}-\d{2}$/) || dateString.match(/^\d{4}$/)) {
					data.date = dateString;
				} else {
					$(dateInput).css({borderBottom: '1px solid red'});
					return false;
				}
			} else {
				var startString = startDate.value;
				var endString = endDate.value;
				var error = false;
				var padStart = '';
				var padEnd = '';
				
				if (startString.match(/^\d{4}-\d{2}-\d{2}$/)) {
					data.startDate = startString;
				} else if (startString.match(/^\d{4}$/)) {
					data.startDate = startString;
					padStart = '-01-01';
				} else {
					$(startDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				if (endString.match(/^\d{4}-\d{2}-\d{2}$/)) {
					data.endDate = endString;
				} else if (endString.match(/^\d{4}$/)) {
					data.endDate = endString;
					padEnd = '-01-01';
				} else {
					$(endDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				var start = $.datepicker.parseDate('yy-mm-dd', startString+padStart);
				var end = $.datepicker.parseDate('yy-mm-dd', endString+padEnd);
				
				if (start > end) {
					$(startDate).css({borderBottom: '1px solid red'});
					$(endDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				if (error) return false;
			}
		} else {
			data = null;
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity('date', data);
		}
		date.dialog('close');
	};
	
	return {
		show: function(config) {
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Tag ';
			
			if (mode == ADD) {
				var dateValue = '';
				var dateString = w.editor.currentBookmark.rng.toString();
				var dateObj = new Date(dateString);
				var year = dateObj.getFullYear();
				if (!isNaN(year)) {
					if (dateString.length > 4) {
						var month = dateObj.getMonth();
						if (month < 10) month = '0'+month;
						var day = dateObj.getDate();
						if (day < 10) day = '0'+day;
						dateValue = year+'-'+month+'-'+day;
					} else {
						year++; // if just the year, Date makes it dec 31st at midnight of the prior year
						dateValue = year;
					}
				}

				toggleDate('date');
				$('#type_date').attr('checked', true);
				dateInput.value = dateValue;
				startDate.value = '';
				endDate.value = '';
			} else {
				prefix = 'Edit ';
				var info = config.entry.info;
				if (info.date) {
					toggleDate('date');
					$('#type_date').attr('checked', true);
					dateInput.value = info.date;
					startDate.value = '';
					endDate.value = '';
				} else {
					toggleDate('range');
					$('#type_date').attr('checked', false);
					dateInput.value = '';
					startDate.value = info.startDate;
					endDate.value = info.endDate;
				}
			}
			
			$(dateInput).css({borderBottom: ''});
			$(startDate).css({borderBottom: ''});
			$(endDate).css({borderBottom: ''});
			var title = prefix+config.title;
			date.dialog('option', 'title', title);
			if (config.pos) {
				date.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				date.dialog('option', 'position', 'center');
			}
			date.dialog('open');
		},
		hide: function() {
			date.dialog('close');
		}
	};
};var HeaderDialog = function(config) {
	var w = config.writer;
	
	$('#header').append(''+
	'<div id="headerLink"><h2>Edit Header</h2></div>');
	
	$(document.body).append(''+
	'<div id="headerDialog">'+
	'<textarea id="header_textarea" style="width: 100%; height: 98%;"></textarea>'+
	'</div>'+
	'</div>');
	
	var header = $('#headerDialog');
	header.dialog({
		title: 'Edit Header',
		modal: true,
		resizable: true,
		height: 380,
		width: 400,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				var editorString = '<head>'+$('#header_textarea').val()+'</head>';
				var xml;
				try {
					xml = $.parseXML(editorString);
				} catch(e) {
					w.d.show('message', {
						title: 'Invalid XML',
						msg: 'There was an error parsing the XML.',
						type: 'error'
					});
					return false;
				}
				
				var headerString = '';
				$(xml).find('head').children().each(function(index, el) {
					headerString += w.fm.buildEditorString(el);
				});
				$(w.editor.getBody()).find('span[_tag="'+w.header+'"]').html(headerString);
				
				header.dialog('close');
			},
			'Cancel': function() {
				header.dialog('close');
			}
		}
	});
	
	function doOpen() {
		var headerString = '';
		var headerEl = $(w.editor.getBody()).find('span[_tag="'+w.header+'"]');
		headerEl.children().each(function(index, el) {
			headerString += w.fm.buildXMLString($(el));
		});
		$('#header_textarea').val(headerString);
		header.dialog('open');
	}
	
	$('#headerLink').click(function() {
		doOpen();
	});
	
	return {
		show: function(config) {
			doOpen();
		},
		hide: function() {
			header.dialog('close');
		}
	};
};var KeywordDialog = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="keywordDialog">'+
		'<div id="keyword_choice">'+
			'<div id="keyword_key">'+
			    '<h3>Keyword</h3>'+
			    '<div><label for="keyword_input">Keyword</label><input type="text" id="keyword_input" /></div>'+
		    '</div>'+
		    '<div id="keyword_index">'+
			    '<h3>Index Term</h3>'+
			    '<div>'+
				    '<label for="keyword_lookup">OCLC Lookup</label><input type="text" id="keyword_lookup" />'+
				    '<ul class="searchResults" style="overflow: auto; border: 1px solid #fff;"></ul>'+
			    '</div>'+
			'</div>'+
		'</div>'+
	'</div>');
	
	$('#keyword_choice').accordion({
		header: 'div > h3',
		fillSpace: true
	});
	
	var keyword = $('#keywordDialog');
	keyword.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#keywordDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 400,
		width: 400,
		autoOpen: false,
		buttons: {
			'Tag Keyword': function() {
				keywordResult();
			},
			'Cancel': function() {
				keywordResult(true);
			}
		}
	});
	
	$('#keyword_lookup').keyup(function() {
		var query = 'oclcts.preferredTerm="'+$(this).val()+'"';
		$.ajax({
			url: w.baseUrl+'services/ts-oclc/lcsh/',
			data: {
				query: query,
				version: '1.1',
				operation: 'searchRetrieve',
				recordSchema: 'http://www.w3.org/2004/02/skos/core',
				recordPacking: 'xml',
				maximumRecords: '15',
				startRecord: '1'
			},
			type: 'GET',
			dataType: 'xml',
			success: function(data, status, xhr) {
				var records = $('record', data);
				showResults(records);
			},
			error: function(xhr, status, error) {
				alert(error);
			}
		});
	});
	
	var showResults = function(records) {
		var list = $('#keyword_index ul');
		list.empty();
		if (records.length == 0) {
			list.html('<li class="unselectable last"><span>No results.</span></li>');
		} else {
			var ids = [];
			var types = [];
			var liString = '';
			records.each(function(index, el) {
				var label = $('skos\\:prefLabel, prefLabel', el).text();
				var id = $('dct\\:identifier, identifier', el).first().text();
				var type = $('dct\\:type, type', el).last().text();
				var last = '';
				if (index == records.length -1) last = 'last';
				ids.push(id);
				types.push(type);
				liString += '<li class="unselectable '+last+'"><span>'+label+'</span></li>';
			});
			
			list.html(liString);
			$('li', list).each(function(index, el) {
				$(this).data('id', ids[index]);
				$(this).data('type', types[index]);
				$(this).data('title', $(this).text());
			});
			
			$('li', list).click(function(event) {
				list.css({borderColor: '#fff'});
				var remove = $(this).hasClass('selected');
				$('li', list).removeClass('selected');
				if (!remove ) $(this).addClass('selected');
			});
			
			$('li', list).dblclick(function(event) {
				$('li', list).removeClass('selected');
				$(this).addClass('selected');
				keywordResult();
			});
		}
		var height = list.parents('div.ui-accordion-content').height();
		list.height(height - 20);
	};
	
	var keywordResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var tab = $('#keywordDialog div.ui-accordion-content-active').parent()[0].id;
			if (tab == 'keyword_key') {
				data = {
					type: 'keyword',
					keyword: $('#keyword_input').val()
				};
			} else {
				data = $('#keywordDialog div.ui-accordion-content-active ul li.selected').data();
				if (data) {
					for (var key in data) {
						if (key.match(/jQuery/)) {
							delete data[key];
						}
					}
				} else {
					$('#keywordDialog div.ui-accordion-content-active ul').css({borderColor: 'red'});
					return false;
				}
				data.lookup = $('#keyword_lookup').val();
				data.type = 'lookup';
			}
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		keyword.dialog('close');
		currentType = null;
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Add ';
			
			var title = prefix+config.title;
			keyword.dialog('option', 'title', title);
			if (config.pos) {
				keyword.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				keyword.dialog('option', 'position', 'center');
			}
			keyword.dialog('open');
			
			$('#keyword_input').val('');
			$('#keyword_lookup').val('');
			$('#keyword_index ul').css({borderColor: '#fff'}).empty();
			$('#keyword_choice').accordion('resize');
			if (mode == ADD) {
				$('#keyword_choice').accordion('activate', 0);
			} else {
				prefix = 'Edit ';
				if (config.entry.info.type == 'keyword') {
					$('#keyword_choice').accordion('activate', 0);
					$('#keyword_input').val(config.entry.info.keyword);
				} else {
					$('#keyword_choice').accordion('activate', 1);
					$('#keyword_lookup').val(config.entry.info.lookup);
				}
			}
		},
		hide: function() {
			keyword.dialog('close');
		}
	};
};var LinkDialog = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="linkDialog">'+
		'<div><label for="link_input">HTTP Link</label><input type="text" id="link_input" style="margin-right: 10px;"/><button>Check Link</button></div>'+
	'</div>');
	
	var link = $('#linkDialog');
	link.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#linkDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 125,
		width: 345,
		autoOpen: false,
		buttons: {
			'Tag Link': function() {
				linkResult();
			},
			'Cancel': function() {
				linkResult(true);
			}
		}
	});
	
	$('#linkDialog button').button().click(function() {
		var src = $('#link_input').val();
		if (src != '') {
			if (src.match(/^https?:\/\//) == null) {
				src = 'http://'+src;
			}
			window.open(src, 'linkTestWindow');
		}
	});
	
	var linkResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var data = {
				url: $('#link_input').val() 
			};
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		link.dialog('close');
		currentType = null;
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Add ';
			
			if (mode == ADD) {
				$('#link_input').val('http://');
			} else {
				prefix = 'Edit ';
				$('#link_input').val(config.entry.info.url);
			}
			
			var title = prefix+config.title;
			link.dialog('option', 'title', title);
			if (config.pos) {
				link.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				link.dialog('option', 'position', 'center');
			}
			link.dialog('open');
		},
		hide: function() {
			link.dialog('close');
		}
	};
};var MessageDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
	'<div id="messageDialog">'+
	    '<p>'+
	    '<span class="ui-state-highlight" style="border: none;"><span style="float: left; margin-right: 4px;" class="ui-icon ui-icon-info"></span></span>'+
	    '<span class="ui-state-error" style="border: none;"><span style="float: left; margin-right: 4px;" class="ui-icon ui-icon-alert"></span></span>'+
	    '<span class="message"></span>'+
	    '</p>'+
	'</div>');
	
	var message = $('#messageDialog');
	message.dialog({
		modal: true,
		resizable: true,
		closeOnEscape: true,
		height: 250,
		width: 300,
		autoOpen: false
	});
	
	return {
		show: function(config) {
			var title = config.title;
			var msg = config.msg;
			var modal = config.modal == null ? true : config.modal;
			var type = config.type;
			
			$('#messageDialog > p > span[class^=ui-state]').hide();
			if (type == 'info') {
				$('#messageDialog > p > span[class=ui-state-highlight]').show();
			} else if (type == 'error') {
				$('#messageDialog > p > span[class=ui-state-error]').show();
			}
			
			message.dialog('option', 'title', title);
			message.dialog('option', 'modal', modal);
			message.dialog('option', 'buttons', {
				'Ok': function() {
					message.dialog('close');
				}
			});
			$('#messageDialog > p > span[class=message]').html(msg);
			
			message.dialog('open');
		},
		confirm: function(config) {
			var title = config.title;
			var msg = config.msg;
			var callback = config.callback;
			
			$('#messageDialog > p > span[class^=ui-state]').hide();
			
			message.dialog('option', 'title', title);
			message.dialog('option', 'buttons', {
				'Yes': function() {
					callback(true);
					message.dialog('close');
				},
				'No': function() {
					callback(false);
					message.dialog('close');
				}
			});
			$('#messageDialog > p > span[class=message]').html(msg);
			
			message.dialog('open');
		},
		hide: function() {
			message.dialog('close');
		}
	};
};var NoteDialog = function(config) {
	var w = config.writer;
	
	var noteEditor = null;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="noteDialog">'+
		'<div id="note_type"><p>Type</p>'+
		'<input type="radio" id="note_re" name="type" value="research" /><label for="note_re" title="Internal to projects">Research Note</label>'+
		'<input type="radio" id="note_scho" name="type" value="scholarly" /><label for="note_scho" title="Footnotes/endnotes">Scholarly Note</label>'+
		'<input type="radio" id="note_ann" name="type" value="annotation" /><label for="note_ann" title="Informal notes">Annotation</label>'+
		'<input type="radio" id="note_trans" name="type" value="translation" /><label for="note_trans">Translation</label>'+
		'</div>'+
	    '<textarea id="note_textarea"></textarea>'+
	    '<div id="note_access"><p>Access</p>'+
		'<input type="radio" id="note_pub" name="access" value="public" /><label for="note_pub">Public</label>'+
		'<input type="radio" id="note_pro" name="access" value="project" /><label for="note_pro">Project</label>'+
		'<input type="radio" id="note_pri" name="access" value="private" /><label for="note_pri">Private</label>'+
		'</div>'+
	'</div>');
	
	var note = $('#noteDialog');
	note.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#noteDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 450,
		width: 405,
		autoOpen: false,
		buttons: {
			'Tag Note': function() {
				noteResult();
			},
			'Cancel': function() {
				noteResult(true);
			}
		}
	});
	$('#note_type, #note_access').buttonset();

	$('#note_textarea').tinymce({
		script_url : 'js/tinymce/jscripts/tiny_mce/tiny_mce.js',
		height: '225',
		width: '380',
		theme: 'advanced',
		theme_advanced_buttons1: 'bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,bullist,numlist,|,formatselect',
		theme_advanced_buttons2: '',
		theme_advanced_buttons3: '',
		theme_advanced_toolbar_location : 'top',
	    theme_advanced_toolbar_align : 'left',
		theme_advanced_path: false,
		theme_advanced_statusbar_location: 'none',
		setup: function(ed) {
			noteEditor = ed;
		}
	});
	
	var noteResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var content = w.u.escapeHTMLString(noteEditor.getContent());
			var data = {
				content: content,
				type: $('#note_type input:checked').val(),
				access: $('#note_access input:checked').val()
			};
		}
		tinyMCE.activeEditor = tinyMCE.selectedInstance = w.editor; // make sure original editor is active
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		note.dialog('close');
		currentType = null;
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Add ';
			
			if (mode == ADD) {
				$('#note_type input:eq(0)').click();
				$('#note_access input:eq(0)').click();
				noteEditor.setContent('');
			} else {
				prefix = 'Edit ';
				$('#note_type input[value="'+config.entry.info.type+'"]').click();
				$('#note_access input[value="'+config.entry.info.access+'"]').click();
				var content = w.u.unescapeHTMLString(config.entry.info.content);
				noteEditor.setContent(content);
			}
			
			var title = prefix+config.title;
			note.dialog('option', 'title', title);
			if (config.pos) {
				note.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				note.dialog('option', 'position', 'center');
			}
			note.dialog('open');
		},
		hide: function() {
			note.dialog('close');
		}
	};
};var SearchDialog = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="searchDialog">'+
		// need absolute positioning so accordion height is calculated properly
	    '<div style="position: absolute; top: 10px; left: 10px; right: 10px; height: 31px;">'+
		    '<label for="search_query">Search</label>'+
		    '<input type="text" name="query" id="search_query" />'+
	    '</div>'+
	    '<div style="position: absolute; top: 41px; left: 10px; right: 10px; bottom: 70px;">'+
		    '<div id="lookupServices">'+
		    	'<div id="lookup_project">'+
			    '<h3>Results from '+w.project+' Project</h3>'+
			    '<div><div class="searchResultsParent"><ul class="searchResults"></ul></div></div>'+
			    '</div>'+
//			    '<div id="lookup_orca">'+
//			    '<h3>Results from ORCA</h3>'+
//			    '<div><div class="searchResultsParent"><ul class="searchResults"></ul></div></div>'+
//			    '</div>'+
			    '<div id="lookup_viaf">'+
			    '<h3>Results from Web</h3>'+
			    '<div><div class="searchResultsParent"><ul class="searchResults"></ul></div></div>'+
			    '</div>'+
			    '<div id="lookup_alternate">'+
				    '<h3>Alternate Identifier</h3>'+
				    '<div>'+
					    '<div><input type="radio" name="altLookup" /><label for="search_name">Name</label><ins name="name" class="ui-icon ui-icon-help">&nbsp;</ins><br/><input type="text" name="name" id="search_name" /></div>'+
					    '<div><input type="radio" name="altLookup" /><label for="search_localid">Local Identifier</label><ins name="localid" class="ui-icon ui-icon-help">&nbsp;</ins><br/><input type="text" name="localid" id="search_localid" /></div>'+
					    '<div><input type="radio" name="altLookup" /><label for="search_uri">URI</label><ins name="uri" class="ui-icon ui-icon-help">&nbsp;</ins><br/><input type="text" name="uri" id="search_uri" /></div>'+
				    '</div>'+
			    '</div>'+
		    '</div>'+
	    '</div>'+
	    '<div id="certainty" style="position: absolute; bottom: 0; left: 10px; right: 10px; height: 65px;">'+
	    	'<p>This identification is:</p>'+
			'<input type="radio" id="c_definite" name="certainty" value="definite" /><label for="c_definite">Definite</label>'+
			'<input type="radio" id="c_reasonable" name="certainty" value="reasonable" /><label for="c_reasonable">Reasonably Certain</label>'+
			'<input type="radio" id="c_speculative" name="certainty" value="speculative" /><label for="c_speculative">Speculative</label>'+
	    '</div>'+
	'</div>');
	
	var search = $('#searchDialog');
	search.dialog({
		modal: true,
		resizable: false,
		dialogClass: 'splitButtons',
		closeOnEscape: false,
		open: function(event, ui) {
			$('#searchDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 550,
		width: 400,
		autoOpen: false
	});
	var searchInput = $('#search_query')[0];
	$(searchInput).bind('keyup', function() {
		doQuery();
	});
	
	$('#lookupServices').accordion({
		header: 'div > h3',
		fillSpace: true,
		activate: function(event, ui) {
			if ($('#lookupServices').accordion('option', 'active') < 2) doQuery();
		}
	});
	
	$('#lookup_alternate ins').click(function() {
		var type = $(this).attr('name');
		var msg = '';
		if (type == 'name') {
			msg = 'Enter a first and last name, which will be encoded as a FOAF URN.';
		} else if (type == 'localid') {
			msg = 'Enter the local id that you system uses for this person. It will be encoded as an URN.';
		} else if (type == 'uri') {
			msg = 'Enter a resolvable URI that identifies this person, e.g. their VIAF URI, LOC URI, etc.';
		}
		w.d.show('message', {
			title: 'Help',
			msg: msg,
			modal: false
		});
	});
	$('#lookup_alternate input[type="text"]').focus(function() {
		$(this).prevAll('input').prop('checked', true);
	}).keyup(function() {
		$(this).css({borderColor: '#ccc'});
	});
	
	$('#certainty').buttonset();
	
	var doQuery = function() {
		var lookupService = $('#lookupServices div.ui-accordion-content-active').parent()[0].id;
		
		$('#lookupServices div.ui-accordion-content-active div.searchResultsParent').css({borderColor: '#fff'});
		
		$('#lookupServices div.ui-accordion-content-active ul').first().html('<li class="unselectable last"><span>Searching...</span></li>');
		
		var query = searchInput.value;
		
		if (lookupService == 'lookup_project') {
			$.ajax({
				url: w.baseUrl+'services/entity_lookup/uap',
				data: {
					q: 'authlabel:'+query,
					d: 'orlando',
					f: 'by_auth_label',
					v: 'auth_label'
				},
				dataType: 'text json',
				success: function(data, status, xhr) {
					if ($.isPlainObject(data)) data = [data];
					if (data != null) {
						handleResults(data, 'project');
					} else {
						$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul').first().html('<li class="unselectable last"><span>No results.</span></li>');
					}
				},
				error: function(xhr, status, error) {
					if (status == 'parsererror') {
						var lines = xhr.responseText.split(/\n/);
						if (lines[lines.length-1] == '') {
							lines.pop();
						}
						var string = lines.join(',');
						var data = $.parseJSON('['+string+']');
						handleResults(data, 'project');
					} else {
						$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul').first().html('<li class="unselectable last"><span>Server error.</span></li>');
					}
				}
			});
		} else if (lookupService == 'lookup_viaf') {
			$.ajax({
				url: 'http://viaf.org/viaf/AutoSuggest',
				data: {
					query: query
				},
				dataType: 'jsonp',
				success: function(data, status, xhr) {
					if (data != null && data.result != null) {
						handleResults(data.result, 'viaf');
					} else {
						$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul').first().html('<li class="unselectable last"><span>No results.</span></li>');
					}
				},
				error: function() {
					$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul').first().html('<li class="unselectable last"><span>Server error.</span></li>');
				}
			});
		} else if (lookupService == 'lookup_orca') {
			var data = [];
			var length = Math.ceil(Math.random()*10);
			for (var i = 0; i < length; i++) {
				var d = {
					date: new Date(Math.round(Math.random()*1000000000000)).toDateString()
				};
				d[currentType] = 'Random '+currentType+' '+i;
				data.push(d);
			}
			handleResults(data);
		}
	};
	
	var handleResults = function(results, lookup) {
		var formattedResults = '';
		var last = '';
		
		if (results.length == 0) {
			$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul').first().html('<li class="unselectable last"><span>No results.</span></li>');
		} else {
			var r, i, label;
			for (i = 0; i < results.length; i++) {
				r = results[i];
				
				if (lookup == 'project') {
					label = r.entry.authorityLabel;
				} else if (lookup == 'viaf') {
					label = r.term;
				} else {
					label = r[currentType];
				}

				if (i == results.length - 1) last = 'last';
				else last = '';
				
				formattedResults += '<li class="unselectable '+last+'">';
				formattedResults += '<span>'+label+'</span>';
				formattedResults += '</li>';
			}
			
			$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul').first().html(formattedResults);
			
			$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul li').each(function(index) {
				$(this).data(results[index]);
			});
			
			$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul li').click(function(event) {
				$('#lookupServices div.ui-accordion-content-active div.searchResultsParent').css({borderColor: '#fff'});
				var remove = $(this).hasClass('selected');
				$('#lookupServices div.ui-accordion-content-active ul li').removeClass('selected');
				if (!remove ) $(this).addClass('selected');
			});
			
			$('#lookupServices div.ui-accordion-content-active div.searchResultsParent ul li').dblclick(function(event) {
				$('#lookupServices div.ui-accordion-content-active ul li').removeClass('selected');
				$(this).addClass('selected');
				searchResult();
			});
		}
	};
	
	var searchResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var lookupService = $('#lookupServices div.ui-accordion-content-active').parent()[0].id;
			if (lookupService == 'lookup_alternate') {
				var type = $('#lookup_alternate input[name="altLookup"]:checked');
				if (type.length == 1) {
					var value = type.nextAll('input').val();
					if (value == '') {
						$('#lookup_alternate input[type="text"]').css({borderColor: '#ccc'});
						type.nextAll('input').css({borderColor: 'red'});
						return false;
					} else {
						data = {
							type: 'alt_id',
							typeName: type.nextAll('input').attr('name'),
							value: value
						};
					}
				} else {
					$('#lookup_alternate input[type="text"]').css({borderColor: '#ccc'});
					$('#lookup_alternate input[name="altLookup"]').first().prop('checked', true).nextAll('input').css({borderColor: 'red'});
					return false;
				}
			} else {
				data = $('#lookupServices div.ui-accordion-content-active ul li.selected').data();
				if (data) {
					for (var key in data) {
						if (key.match(/jQuery/)) {
							delete data[key];
						}
					}
				} else {
					$('#lookupServices div.ui-accordion-content-active div.searchResultsParent').css({borderColor: 'red'});
					return false;
				}
			}
			if (data) data.certainty = $('#certainty input:checked').val();
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		search.dialog('close');
		currentType = null;
	};
	
	var createNew = function() {
		w.d.show('add'+currentType, {});
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Tag ';
			var query;
			if (mode == EDIT) {
				prefix = 'Edit ';
				query = w.entities[w.editor.currentEntity].props.content;
			} else {
				query = w.editor.currentBookmark.rng.toString();
			}
			
			$('#lookupServices div.searchResultsParent').css({borderColor: '#fff'}).children('ul').empty();
			
			$('#lookup_alternate input[type="text"]').css({borderColor: '#ccc'}).val('');
			
			searchInput.value = query;
			
			var title = prefix+config.title;
			search.dialog('option', 'title', title);
			search.dialog('option', 'buttons', [{
				text: 'Cancel',
				click: function() {
					searchResult(true);
				}
			},{
				text: 'Add New '+config.title,
				click: function() {
					createNew();
				}
			},{
				text: 'Tag '+config.title,
				click: function() {
					searchResult();
				}
			}]);
			if (config.pos) {
				search.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				search.dialog('option', 'position', 'center');
			}
			search.dialog('open');
			
			$('#lookupServices').accordion('resize');
			if (mode == EDIT) {
				$('#certainty input[value="'+config.entry.info.certainty+'"]').click();
				if (config.entry.info.type && config.entry.info.type == 'alt_id') {
					$('#lookupServices').accordion('activate', 2);
					$('#lookup_alternate input[name="'+config.entry.info.typeName+'"]').val(config.entry.info.value).prevAll('input').click();
				} else {
					$('#lookupServices').accordion('activate', 0);
				}
			} else {
				$('#c_definite').trigger('click');
				if ($('#lookupServices').accordion('option', 'active') == 0) {
					doQuery();
				} else {
					$('#lookupServices').accordion('activate', 0);
				}
			}
		},
		hide: function() {
			search.dialog('close');
		}
	};
};var SettingsDialog = function(writer, config) {
	var w = writer;
	
	var settings = {
		fontSize: '11pt',
		fontFamily: 'Book Antiqua',
		showEntityBrackets: false,
		showStructBrackets: false
	};
	
	jQuery.extend(settings, config);
	
	$('#header').append(''+
	'<div id="helpLink"><img src="img/help.png" title="Help"/><h2>Help</h2></div>'+
	'<div id="settingsLink"><h2>Settings</h2></div>');
	
	$(document.body).append(''+
	'<div id="settingsDialog">'+
	'<div>'+
	'<label>Font Size</label><select name="fontsize">'+
	'<option value="9pt">9pt</option>'+
	'<option value="10pt">10pt</option>'+
	'<option value="11pt">11pt</option>'+
	'<option value="12pt">12pt</option>'+
	'<option value="13pt">13pt</option>'+
	'</select>'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label>Font Type</label><select name="fonttype">'+
	'<option value="Arial" style="font-family: Arial; font-size: 12px;">Arial</option>'+
	'<option value="Book Antiqua" style="font-family: Book Antiqua; font-size: 12px;">Book Antiqua</option>'+
	'<option value="Georgia" style="font-family: Georgia; font-size: 12px;">Georgia</option>'+
	'<option value="Helvetica" style="font-family: Helvetica; font-size: 12px;">Helvetica</option>'+
	'<option value="Palatino" style="font-family: Palatino; font-size: 12px;">Palatino</option>'+
	'<option value="Tahoma" style="font-family: Tahoma; font-size: 12px;">Tahoma</option>'+
	'<option value="Times New Roman" style="font-family: Times New Roman; font-size: 12px;">Times New Roman</option>'+
	'<option value="Verdana" style="font-family: Verdana; font-size: 12px;">Verdana</option>'+
	'</select>'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label for="showentitybrackets">Show Entity Brackets</label>'+
	'<input type="checkbox" id="showentitybrackets" />'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label for="showstructbrackets">Show Tags</label>'+
	'<input type="checkbox" id="showstructbrackets" />'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label>Editor Mode</label><select name="editormode">'+
	'<option value="0">XML & RDF (overlapping entities)</option>'+
	'<option value="1">XML (no overlap)</option>'+
	'</select>'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	// schema selection is disabled for now, as changing this would require loading the new schema
	'<label>Schema</label><select name="schema" disabled="disabled">'+
	'<option value="cwrcbasic">CWRC Basic TEI Schema</option>'+
	'<option value="events">Events Schema</option>'+
	'</select>'+
	'</div>'+
	'</div>'+
	'<div id="helpDialog">'+
	'</div>');
	
	$('#settingsLink').click(function() {
		$('select[name="fontsize"] > option[value="'+settings.fontSize+'"]', $('#settingsDialog')).attr('selected', true);
		$('select[name="fonttype"] > option[value="'+settings.fontFamily+'"]', $('#settingsDialog')).attr('selected', true);
		$('#showentitybrackets').prop('checked', settings.showEntityBrackets);
		$('#showstructbrackets').prop('checked', settings.showStructBrackets);
		$('select[name="editormode"] > option[value="'+w.mode+'"]', $('#settingsDialog')).attr('selected', true);
		$('select[name="schema"] > option[value="'+w.validationSchema+'"]', $('#settingsDialog')).attr('selected', true);
		$('#settingsDialog').dialog('open');
	});
	
	$('#helpLink').click(function() {
		if ($('#helpDialog iframe').length == 0) {
			$('#helpDialog').html('<iframe src="https://sites.google.com/site/cwrcwriterhelp/home"/>');
		}
		$('#helpDialog').dialog('open');
	});
	
	$('#settingsDialog').dialog({
		title: 'Settings',
		modal: true,
		resizable: false,
		closeOnEscape: true,
		height: 270,
		width: 325,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				applySettings();
				$('#settingsDialog').dialog('close');
			},
			'Cancel': function() {
				$('#settingsDialog').dialog('close');
			}
		}
	});
	
	$('#helpDialog').dialog({
		title: 'Help',
		modal: true,
		resizable: true,
		closeOnEscape: true,
		height: 500,
		width: 900,
		autoOpen: false,
		buttons: {
			'Close': function() {
				$('#helpDialog').dialog('close');
			}
		}
	});
	
	var applySettings = function() {
		var editorMode = parseInt($('select[name="editormode"]', $('#settingsDialog')).val());
		if (editorMode != w.mode) {
			var doModeChange = true;
			if (w.mode == w.XMLRDF && editorMode == w.XML) {
				var overlaps = _doEntitiesOverlap();
				if (overlaps) {
					doModeChange = false;
					w.d.show('message', {
						title: 'Error',
						msg: 'You have overlapping entities and are trying to change to XML mode (which doesn\'t permit overlaps).  Please remove the overlapping entities and try again.',
						type: 'error'
					});
				}
			}
			if (doModeChange) {
				w.mode = editorMode;
			}
		}
		
		settings.fontSize = $('select[name="fontsize"]', $('#settingsDialog')).val();
		settings.fontFamily = $('select[name="fonttype"]', $('#settingsDialog')).val();
		
		if (settings.showEntityBrackets != $('#showentitybrackets').prop('checked')) {
			w.editor.$('body').toggleClass('showEntityBrackets');
		}
		settings.showEntityBrackets = $('#showentitybrackets').prop('checked');
		
		if (settings.showStructBrackets != $('#showstructbrackets').prop('checked')) {
			w.editor.$('body').toggleClass('showStructBrackets');
		}
		settings.showStructBrackets = $('#showstructbrackets').prop('checked');
		
		w.validationSchema = $('select[name="schema"]', $('#settingsDialog')).val();
		
		var styles = {
			fontSize: settings.fontSize,
			fontFamily: settings.fontFamily
		};
		w.editor.dom.setStyles(w.editor.dom.getRoot(), styles);
	};
	
	var _doEntitiesOverlap = function() {
		// remove highlights
		w.highlightEntity();
		
		for (var id in w.entities) {
			var markers = w.editor.dom.select('entity[name="'+id+'"]');
			var start = markers[0];
			var end = markers[1];
			var currentNode = start;
			while (currentNode != end  && currentNode != null) {
				currentNode = currentNode.nextSibling;
				if (currentNode.nodeName.toLowerCase() == 'entity' && currentNode != end) {
					return true;
				}
			}
		}
		return false;
	};
	
	return {
		getSettings: function() {
			return settings;
		}
	};
};var TitleDialog = function(config) {
	var w = config.writer;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="titleDialog">'+
		'<div>'+
			'Type<br/>'+
			'<input type="radio" value="a" name="level" id="level_a"/><label for="level_a">Analytic <span style="font-size: 8px;">(article, poem, or other item published as part of a larger item)</span></label><br/>'+
			'<input type="radio" value="m" name="level" id="level_m" checked="checked"/><label for="level_m">Monographic <span style="font-size: 8px;">(book, collection, single volume, or other item published as a distinct item)</span></label><br/>'+
			'<input type="radio" value="j" name="level" id="level_j"/><label for="level_j">Journal <span style="font-size: 8px;">(magazine, newspaper or other periodical publication)</span></label><br/>'+
			'<input type="radio" value="s" name="level" id="level_s"/><label for="level_s">Series <span style="font-size: 8px;">(book, radio, or other series)</span></label><br/>'+
			'<input type="radio" value="u" name="level" id="level_u"/><label for="level_u">Unpublished <span style="font-size: 8px;">(thesis, manuscript, letters or other unpublished material)</span></label><br/>'+
		'</div>'+
		'<div>'+
			'Equivalent title (optional) <input name="alt" type="text" /> <span style="font-size: 8px;">(standard form of title)</span>'+
		'</div>'+
		'<div>'+
			'Refer to text (optional) <input name="ref" type="text" />'+
		'</div>'+
		'<div>'+
			'<input type="checkbox" name="unformatted" id="unformatted"/>'+
			'<label for="unformatted">Unformatted</label>'+
		'</div>'+
	'</div>');
	
	var title = $('#titleDialog');
	title.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#titleDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 310,
		width: 435,
		autoOpen: false,
		buttons: {
			'Tag Text/Title': function() {
				titleResult();
			},
			'Cancel': function() {
				titleResult(true);
			}
		}
	});
	
	$('#titleDialog input').keyup(function(event) {
		if (event.keyCode == '13') {
			event.preventDefault();
			titleResult();
		}
	});
	
	var titleResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var level = $('input[name="level"]:checked', title).val();
			var ref = $('input[name="ref"]', title).val();
			var alt = $('input[name="alt"]', title).val();
			var unformatted = $('input[name="unformatted"]', title).prop('checked');
			
			data = {
				level: level,
				ref: ref,
				alt: alt,
				unformatted: unformatted
			};
			
//			if (level == 'a' || level == 'u') {
//				data['class'] = 'titleTagQuotes';
//			} else if (level == 'm' || level == 'j' || level == 's') {
//				data['class'] = 'titleTagItalics';
//			}
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity('title', data);
		}
		title.dialog('close');
	};
	
	return {
		show: function(config) {
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Tag ';
			
			if (mode == ADD) {
				$('input[value="m"]', title).attr('checked', true);
				$('input[name="ref"]', title).attr('value', '');
				$('input[name="alt"]', title).attr('value', '');
				$('input[name="unformatted"]', title).attr('checked', false);
			} else {
				prefix = 'Edit ';
				var level = config.entry.info.level;
				var ref = config.entry.info.ref;
				var alt = config.entry.info.alt;
				var unformatted = config.entry.info.unformatted;
				
				$('input[value="'+level+'"]', title).attr('checked', true);
				$('input[name="ref"]', title).attr('value', ref);
				$('input[name="alt"]', title).attr('value', alt);
				$('input[name="unformatted"]', title).attr('checked', unformatted);
			}
			
			var t = prefix+config.title;
			title.dialog('option', 'title', t);
			if (config.pos) {
				title.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				title.dialog('option', 'position', 'center');
			}
			title.dialog('open');
		},
		hide: function() {
			title.dialog('close');
		}
	};
};var TripleDialog = function(config) {
	var w = config.writer;
	
	var precidateList = {
		person: ['is a child of', 'is a parent of', 'is related to', 'was born on', 'died on'],
		place: ['is located within', 'contains']
	};
	
	$(document.body).append(''+
	'<div id="tripleDialog">'+
		'<div id="tripleColumnsParent">'+
	    '<div id="subjectColumn" class="column"><h2>Subject</h2><ul class="entitiesList"></ul><div class="customEntry"><input type="text" name="customSubject" value="" /></div></div>'+
	    '<div id="predicateColumn" class="column"><h2>Predicate</h2><ul></ul><div class="customEntry"><input type="text" name="customPredicate" value="" /></div></div>'+
	    '<div id="objectColumn" class="column"><h2>Object</h2><ul class="entitiesList"></ul><div class="customEntry"><input type="text" name="customObject" value="" /></div></div>'+
	    '</div>'+
	    '<div id="currentRelation">'+
	    '<p></p><button>Add Relation</button>'+
	    '</div>'+
	'</div>');
	
	var d = $('#tripleDialog');
	d.dialog({
		title: 'Add Relation',
		modal: true,
		resizable: true,
		closeOnEscape: true,
		height: 450,
		width: 600,
		autoOpen: false,
		buttons: {
			'Close': function() {
				d.dialog('close');
			}
		}
	});
	
	$('#subjectColumn input').watermark('Custom Subject');
	$('#predicateColumn input').watermark('Custom Predicate');
	$('#objectColumn input').watermark('Custom Object');
	
	$('#tripleColumnsParent input').keyup(function() {
		$(this).parents('.column').find('li').removeClass('selected');
		updateRelationString();
	});
	
	$('#currentRelation button').button({disabled: true}).click(function() {
		var components = getComponents();
		var subject = components[0];
		var predicate = components[1];
		var object = components[2];
		var id = tinymce.DOM.uniqueId('tri_');
		w.triples.push({
			id: id,
			subject: subject,
			predicate: {
				text: predicate.text,
				name: getPredicateName(predicate.text),
				external: predicate.external
			},
			object: object
		});
		w.relations.update();
	});
	
	var loadPredicates = function(type) {
		$('#predicateColumn > ul').empty();
		
		var p = precidateList[type] || ['is associated with'];
		var predicateString = '';
		for (var i = 0; i < p.length; i++) {
			predicateString += '<li>'+p[i]+'</li>';
		}
		$('#predicateColumn > ul').html(predicateString);
		
		$('#predicateColumn ul li').click(function() {
			$(this).siblings('li').removeClass('selected');
			$(this).toggleClass('selected');
			$(this).parents('.column').find('input').val('');
			updateRelationString();
		});
	};
	
	var getPredicateName = function(str) {
		var strs = str.split(/\s/);
		var name = '';
		for (var i = 0; i < strs.length; i++) {
			if (i == 0) {
				name += strs[i].toLowerCase();
			} else {
				name += strs[i].replace(/^./, function(s) {
				    return s.toUpperCase();
				});
			}
		}
		return name;
	};
	
	var getComponents = function() {
		var components = [null, null, null];
		$('#tripleColumnsParent ul').each(function(index, el) {
			var s = $(this).find('.selected');
			if (s.length == 1) {
				components[index] = {text: w.u.escapeHTMLString(s.text()), uri: s.attr('name'), external: false};
			}
		});
		$('#tripleColumnsParent input').each(function(index, el) {
			var val = $(this).val();
			if (val != '') components[index] = {text: w.u.escapeHTMLString(val), uri: w.u.escapeHTMLString(val), external: true};
		});
		
		return components;
	};
	
	var updateRelationString = function() {
		var str = '';
		var components = getComponents();
		var enable = true;
		for (var i = 0; i < components.length; i++) {
			var c = components[i];
			if (c == null) {
				enable = false;
			} else {
				str += c.text;
				if (i < 2) {
					str += ' ';
				} else {
					str += '.';
				}
			}
		}
		
		$('#currentRelation p').text(str);
		
		if (enable) {
			$('#currentRelation button').button('enable');
		} else {
			$('#currentRelation button').button('disable');
		}
	};
	
	var buildEntity = function(entity) {
//		var infoString = '<ul>';
//		for (var infoKey in entity.info) {
//			infoString += '<li><strong>'+infoKey+'</strong>: '+entity.info[infoKey]+'</li>';
//		}
//		infoString += '</ul>';
		return '<li class="'+entity.props.type+'" name="'+entity.props.id+'">'+
			'<span class="box"/><span class="entityTitle">'+entity.props.title+'</span>'+
//			'<div class="info">'+infoString+'</div>'+
		'</li>';
	};
	
	return {
		show: function(config) {
			$('#subjectColumn > ul, #predicateColumn > ul, #objectColumn > ul').empty();
			
			$('#currentRelation p').html('');
			
			var entitiesString = '';
			for (var key in w.entities) {
				var e = w.entities[key];
				entitiesString += buildEntity(e);
			}
			
			$('#subjectColumn > ul, #objectColumn > ul').html(entitiesString);
			$('#tripleDialog .entitiesList > li').hover(function() {
				if (!$(this).hasClass('selected')) {
					$(this).addClass('over');
				}
			},function() {
				if (!$(this).hasClass('selected')) {
					$(this).removeClass('over');
				}
			}).click(function(event) {
				$(this).siblings('li').removeClass('selected');
				$(this).removeClass('over').toggleClass('selected');
				$(this).parents('.column').find('input').val('');
				if ($(this).parents('#subjectColumn').length > 0) {
					if ($(this).hasClass('selected')) {
						var type = w.entities[$(this).attr('name')].props.type;
						loadPredicates(type);
					} else {
						$('#predicateColumn > ul').empty();
					}
				}
				
				updateRelationString();
			});
			
			
			
			d.dialog('open');
		},

		hide: function() {
			d.dialog('close');
		}
	};
};var DialogManager = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var dialogs = {
		message: new MessageDialog(config),
		search: new SearchDialog(config),
		note: new NoteDialog(config),
		citation: new CitationDialog(config),
		correction: new CorrectionDialog(config),
		keyword: new KeywordDialog(config),
		title: new TitleDialog(config),
		date: new DateDialog(config),
		link: new LinkDialog(config),
		addperson: new AddPersonDialog(config),
		addplace: new AddPlaceDialog(config),
		addevent: new AddEventDialog(config),
		addorg: new AddOrganizationDialog(config),
		triple: new TripleDialog(config),
		header: new HeaderDialog(config)
	};
	
	dialogs.person = dialogs.search;
	dialogs.place = dialogs.search;
	dialogs.event = dialogs.search;
	dialogs.org = dialogs.search;
	
	return {
		getCurrentType: function() {
			return currentType;
		},
		show: function(type, config) {
			if (dialogs[type]) {
				currentType = type;
				dialogs[type].show(config);
			}
		},
		confirm: function(config) {
			currentType = 'message';
			dialogs.message.confirm(config);
		},
		hideAll: function() {
			for (var key in dialogs) {
				dialogs[key].hide();
			}
		}
	};
};var Utilities = function(config) {
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
	
	/**
	 * checks the user selection and potential entity markers
	 * @param isStructTag Is the tag a structure tag
	 * @param structAction How is the tag being inserted? (before/after/around/inside)
	 * @returns
	 */
	u.isSelectionValid = function(isStructTag, structAction) {
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
		
		if (!structAction) {
			fixRange(range);
		}
		
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
	
	/**
	 * @param currEl The element that's currently being processed
	 * @param defHits A list of define tags that have already been processed
	 * @param level The level of recursion
	 * @param canContainText Whether the element can contain text
	 */
	var checkForText = function(currEl, defHits, level, canContainText) {
		if (canContainText.isTrue) {
			return false;
		}
		
		// check for the text element
		var textHits = currEl.find('text');
		if (textHits.length > 0) {
			canContainText.isTrue = true;
			return false;
		}
		
		// now process the references
		currEl.find('ref').each(function(index, el) {
			var name = $(el).attr('name');
			if ($(el).parents('element').length > 0 && level > 0) {
				return; // don't get attributes from other elements
			}
			if (!defHits[name]) {
				defHits[name] = true;
				var def = $('define[name="'+name+'"]', writer.schemaXML);
				return checkForText(def, defHits, level+1, canContainText);
			}
		});
	};
	
	/**
	 * Checks to see if the tag can contain text, as specified in the schema
	 * @param tag The tag to check
	 * @returns boolean
	 */
	u.canTagContainText = function(tag) {
		if (tag == writer.root) return false;
		
		var element = $('element[name="'+tag+'"]', writer.schemaXML);
		var defHits = {};
		var level = 0;
		var canContainText = {isTrue: false}; // needs to be an object so change is visible outside of checkForText
		checkForText(element, defHits, level, canContainText);
		
		return canContainText.isTrue;
	};
	
	return u;
};/**
 * Contains the load and save dialogs, as well as file related functions.
 */
var FileManager = function(config) {
	
	var w = config.writer;
	
	var currentDoc = null;
	
	var docNames = [];
	
	$(document.body).append(''+
		'<div id="loader">'+
			'<div id="files"><ul class="searchResults"></ul></div>'+
		'</div>'+
		'<div id="saver">'+
			'<label for="filename">Name</label>'+
			'<input type="text" name="filename"/>'+
			'<p>Please enter letters only.</p>'+
		'</div>'+
		'<div id="unsaved">'+
			'<p>You have unsaved changes.  Would you like to save?</p>'+
		'</div>'+
		'<div id="entitiesConverter"></div>'+
		'<div id="editSourceDialog">'+
			'<textarea style="width: 100%; height: 98%;"></textarea>'+
		'</div>'
		//'<iframe id="editDocLoader" style="display: none;"></iframe>'
	);
	
	var loader = $('#loader');
	loader.dialog({
		title: 'Load Document',
		modal: true,
		height: 450,
		width: 300,
		autoOpen: false,
		buttons: {
			'Load': function() {
				var data = $('#files ul li.selected').data();
				if (data) {
					fm.loadDocument(data.name);
					loader.dialog('close');
				} else {
					$('#files').css({borderColor: 'red'});
				}
			},
			'Cancel': function() {
				loader.dialog('close');
			}
		}
	});
	
	var saver = $('#saver');
	saver.dialog({
		title: 'Save Document As',
		modal: true,
		resizable: false,
		height: 150,
		width: 300,
		autoOpen: false,
		buttons: {
			'Save': function() {
				var name = $('#saver input').val();
				
				if (!_isNameValid(name)) {
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'You may only enter upper or lowercase letters; no numbers, spaces, or punctuation.',
						type: 'error'
					});
					return;
				} else if (name == 'info') {
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name is reserved, please choose a different one.',
						type: 'error'
					});
					return;
				}
				
				if ($.inArray(name, docNames) != -1) {
					// TODO add overwrite confirmation
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name already exists, please choose a different one.',
						type: 'error'
					});
					return;
				} else {
					currentDoc = name;
					fm.validate(true);
					saver.dialog('close');
				}
			},
			'Cancel': function() {
				saver.dialog('close');
			}
		}
	});
	
	var unsaved = $('#unsaved');
	unsaved.dialog({
		title: 'Unsaved Changes',
		modal: true,
		resizable: false,
		height: 150,
		width: 300,
		autoOpen: false,
		buttons: {
			'Save': function() {
				unsaved.dialog('close');
				fm.saveDocument();
			},
			'New Document': function() {
				window.location = 'index.htm';
			}
		}
	});
	
	var edit = $('#editSourceDialog');
	edit.dialog({
		title: 'Edit Source',
		modal: true,
		resizable: true,
		closeOnEscape: true,
		height: 480,
		width: 640,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				// TODO can't get doc by setting string in iframe as it doesn't preserve xml properties
//				var newDocString = $('textarea', edit).val();
//				$('#editDocLoader').contents().find('html').html(newDocString);
//				w.entities = {};
//				w.structs = {};
//				_loadDocumentHandler($('#editDocLoader').contents()[0]);
				w.d.show('message', {
					title: 'Edit Source',
					msg: 'Edit Source does not currently modify the underlying document.',
					type: 'info'
				});
				edit.dialog('close');
			},
			'Cancel': function() {
				edit.dialog('close');
			}
		}
	});
	
	var fm = {};
	
	fm.openLoader = function() {
		$('#files').css({borderColor: '#fff'});
		_getDocuments(function() {
			_populateLoader();
			loader.dialog('open');
		});
	};
	
	fm.openSaver = function() {
		_getDocuments();
		saver.dialog('open');
	};
	
	var _getDocuments = function(callback) {
		$.ajax({
			url: w.baseUrl+'editor/documents',
			type: 'GET',
			dataType: 'json',
			success: [function(data, status, xhr) {
				docNames = data;
			}, callback],
			error: function() {
				w.d.show('message', {
					title: 'Error',
					msg: 'Error getting documents.',
					type: 'error'
				});
//				$.ajax({
//					url: 'xml/test.xml',
//					success: function(data, status, xhr) {
//						_loadDocumentHandler(data);
//					}
//				});
			}
		});
	};
	
	var _populateLoader = function() {
		var formattedResults = '';
		var last = '';
		var d, i;
		for (i = 0; i < docNames.length; i++) {
			d = docNames[i]; 
			
			if (i == docNames.length - 1) last = 'last';
			else last = '';
			
			formattedResults += '<li class="unselectable '+last+'">';
			formattedResults += '<span>'+d+'</span>';
			formattedResults += '</li>';
		}
		
		$('#files ul').first().html(formattedResults);
		
		$('#files ul li').each(function(index) {
			$(this).data({name: docNames[index]});
		});
		
		$('#files ul li').click(function(event) {
			$('#files').css({borderColor: '#fff'});
			var remove = $(this).hasClass('selected');
			$('#files ul li').removeClass('selected');
			if (!remove) $(this).addClass('selected');
		});
		
		$('#files ul li').dblclick(function(event) {
			$('#files ul li').removeClass('selected');
			$(this).addClass('selected');
			fm.loadDocument($(this).data('name'));
			loader.dialog('close');
		});
	};
	
	fm.newDocument = function() {
		if (w.editor.isDirty()) {
			unsaved.dialog('open');
		} else {
			window.location = 'index.htm';
		}
	};
	
	var _isNameValid = function(name) {
		return name.match(/[^A-Za-z]+/) == null;
	};
	
	fm.validate = function(isSave) {
		var docText = _exportDocument(false);
		$.ajax({
			url: w.baseUrl+'services/validator/validate.html',
			type: 'POST',
			dataType: 'XML',
			data: {
				sch: 'http://cwrc.ca/schema/'+w.validationSchema,
				type: 'RNG_XML',
				content: docText
			},
			success: function(data, status, xhr) {
				_validationHandler(data, docText, isSave);
			},
			error: function() {
//				$.ajax({
//					url: 'xml/validation.xml',
//					success: function(data, status, xhr) {
//						_validationHandler(data, docText, isSave);
//					}
//				});
				w.d.show('message', {
					title: 'Error',
					msg: 'An error occurred while trying to validate '+currentDoc+'.',
					type: 'error'
				});
			}
		});
	};
	
	var _validationHandler = function(data, docText, isSave) {
		var doc = currentDoc;
		if (doc == null) doc = 'The current document';
		
		if (isSave) {
			if ($('status', data).text() != 'pass') {
				w.d.confirm({
					title: 'Document Invalid',
					msg: doc+' is not valid. <b>Save anyways?</b>',
					callback: function(yes) {
						if (yes) {
							fm.saveDocument();
						}
					}
				});
			} else {
				fm.saveDocument();
			}
		} else {
			w.validation.showValidationResult(data, docText);
		}
	};
	
	fm.saveDocument = function() {
		if (currentDoc == null) {
			fm.openSaver();
		} else {
			var docText = _exportDocument(true);
			$.ajax({
				url: w.baseUrl+'editor/documents/'+currentDoc,
				type: 'PUT',
				dataType: 'json',
				data: docText,
				success: function(data, status, xhr) {
					w.editor.isNotDirty = 1; // force clean state
					w.d.show('message', {
						title: 'Document Saved',
						msg: currentDoc+' was saved successfully.'
					});
				},
				error: function() {
					w.d.show('message', {
						title: 'Error',
						msg: 'An error occurred and '+currentDoc+' was not saved.',
						type: 'error'
					});
				}
			});
		}
	};
	
	// gets any metadata info for the node and adds as attributes
	// returns an array of 2 strings: opening and closing tags
	function _nodeToStringArray(node) {
		var array = [];
		var id = node.attr('id');
		var tag = node.attr('_tag') || node.attr('_type');
		
		var structEntry = w.structs[id];
		var entityEntry = w.entities[id];
		if (structEntry) {
			var openingTag = '<'+tag;
			for (var key in structEntry) {
				if (key.indexOf('_') != 0) {
					var attName = key;
					if (attName == 'id') attName = w.idName;
					openingTag += ' '+attName+'="'+structEntry[key]+'"';
				}
			}
			openingTag += '>';
			array.push(openingTag);
			array.push('</'+tag+'>');
		} else if (entityEntry) {
			var tags = w.em.getMappingTags(entityEntry, w.validationSchema);
			if (tags) {
				array = tags;
			} else {
				// return empty strings if the entity has no mapping
				array = ['', ''];
			}
		} else {
			// not a valid tag so return empty strings
			array = ['', ''];
		}
		
		return array;
	}
	
	// converts the opening and closing entity tag pairs to a matched set of opening and closing tags
	function convertEntitiesToTags() {
		for (var id in w.entities) {
			var markers = w.editor.dom.select('[name="' + id + '"]');
			var start = markers[0];
			var end = markers[1];

			var nodes = [ start ];
			var currentNode = start;
			while (currentNode != end && currentNode != null) {
				currentNode = currentNode.nextSibling;
				nodes.push(currentNode);
			}
			
			w.editor.$(nodes).wrapAll('<entity id="'+id+'" _type="'+w.entities[id].props.type+'" />');			
			w.editor.$(markers).remove();
		}
	}
	
	/**
	 * Converts the editor node and its contents into an XML string suitable for export.
	 * @param node A jQuery node.
	 * @returns {String}
	 */
	fm.buildXMLString = function(node) {
		var xmlString = '';
		
		function doBuild(currentNode) {
			var tags = _nodeToStringArray(currentNode);
			xmlString += tags[0];
			currentNode.contents().each(function(index, el) {
				if (el.nodeType == 1) {
					doBuild($(el));
				} else if (el.nodeType == 3) {
					xmlString += el.data;
				}
			});
			xmlString += tags[1];
		}
		
		doBuild(node);
		return xmlString;
	};
	
	var _exportDocument = function(includeRDF) {
		// remove highlights
		w.highlightEntity();
		
		var xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
		
		var body = $(w.editor.getBody());
		var clone = body.clone(false, true); // make a copy, don't clone body events, but clone child events
		
		_entitiesToUnicode(body);
		
		// rdf
		var rdfString = '';
		if (includeRDF) {
			rdfString = '\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:w="http://cwrctc.artsrn.ualberta.ca/#">';
			
			// xml mode
			var uri = w.baseUrl+'editor/documents/'+currentDoc;
			rdfString += '\n<rdf:Description rdf:about="'+uri+'">\n\t<w:mode>'+w.mode+'</w:mode>\n</rdf:Description>';
			
			var offsets = _getNodeOffsetsFromRoot(body);
			var relationships = _determineOffsetRelationships(offsets);
			
			// entity and struct listings
			for (var i = 0; i < offsets.length; i++) {
				var o = offsets[i];
				rdfString += '\n<rdf:Description rdf:ID="'+o.id+'">';
				var key;
				for (key in o) {
					rdfString += '\n\t<w:'+key+' type="offset">'+o[key]+'</w:'+key+'>';
				}
				if (o.entity) {
					var entry = w.entities[o.id];
					rdfString += '\n\t<w:type type="props">'+entry.props.type+'</w:type>';
					rdfString += '\n\t<w:content type="props">'+entry.props.content+'</w:content>';
					for (key in entry.info) {
						rdfString += '\n\t<w:'+key+' type="info">'+entry.info[key]+'</w:'+key+'>';
					}
					
					var r = relationships[o.id];
					for (var j = 0; j < r.contains.length; j++) {
						rdfString += '\n\t<w:contains>'+r.contains[j]+'</w:contains>';
					}
					for (var j = 0; j < r.overlaps.length; j++) {
						rdfString += '\n\t<w:overlaps>'+r.overlaps[j]+'</w:overlaps>';
					}
				}
				rdfString += '\n</rdf:Description>';
			}
			
			// triples
			for (var i = 0; i < w.triples.length; i++) {
				var t = w.triples[i];
				rdfString += '\n<rdf:Description rdf:about="'+t.subject.uri+'" w:external="'+t.subject.external+'">'+
				'\n\t<w:'+t.predicate.name+' w:text="'+t.predicate.text+'" w:external="'+t.predicate.external+'">'+
				'\n\t\t<rdf:Description rdf:about="'+t.object.uri+'" w:external="'+t.object.external+'" />'+
				'\n\t</w:'+t.predicate.name+'>'+
				'\n</rdf:Description>';
			}
			
			rdfString += '\n</rdf:RDF>\n';
		}
		
		convertEntitiesToTags();
		
		var root = body.children(w.root);
		// make sure TEI has the right namespace for validation purposes
		if (w.root == 'TEI') {
			root.attr('xmlns','http://www.tei-c.org/ns/1.0');
		}
		var tags = _nodeToStringArray(root);
		xmlString += tags[0];
		
		xmlString += rdfString;
		
		root.contents().each(function(index, el) {
			if (el.nodeType == 1) {
				xmlString += fm.buildXMLString($(el));
			} else if (el.nodeType == 3) {
				xmlString += el.data;
			}
		});
		
		xmlString += tags[1];
		
		body.replaceWith(clone);
		return xmlString;
	};
	
	var _entitiesToUnicode = function(parentNode) {
		var contents = $(parentNode).contents();
		contents.each(function(index, el) {
			if (el.nodeType == Node.TEXT_NODE) {
				if (el.nodeValue.match(/&.+?;/gim)) {
					$('#entitiesConverter')[0].innerHTML = el.nodeValue;
					el.nodeValue = $('#entitiesConverter')[0].innerText || $('#entitiesConverter')[0].firstChild.nodeValue;
				}
			} else if (el.nodeType == Node.ELEMENT_NODE) {
				_entitiesToUnicode(el);
			}
		});
	};
	
	var _getNodeOffsetsFromRoot = function(root) {
		var currentOffset = 0;
		var offsets = [];
		function getOffsets(parent) {
			parent.contents().each(function(index, element) {
				var el = $(this);
				if (this.nodeType == Node.TEXT_NODE && this.data != ' ') {
					currentOffset += this.length;
				} else if (el.is(w.root) || el.attr('_tag')) {
					var id = el.attr('id');
					offsets.push({
						id: id,
						offset: currentOffset,
						length: el.text().length
					});
					getOffsets(el);
				} else if (el.attr('_entity') && el.hasClass('start')) {
					var id = el.attr('name');
					offsets.push({
						id: id,
						offset: currentOffset,
						length: w.entities[id].props.content.length,
						entity: true
					});
				}
			});
		}
		
		getOffsets(root);
		return offsets;
	};
	
	var _determineOffsetRelationships = function(offsets) {
		var relationships = {};
		var entityOffsets = [];
		for (var i = 0; i < offsets.length; i++) {
			var o = offsets[i];
			if (o.entity) {
				entityOffsets.push(o);
				relationships[o.id] = {
					contains: [],
					overlaps: []
				};
			}
		}
		
		var ol = entityOffsets.length;
		for (var i = 0; i < ol; i++) {
			var o1 = entityOffsets[i];
			var span1 = o1.offset + o1.length;
			var r = relationships[o1.id];
			for (var j = 0; j < ol; j++) {
				var o2 = entityOffsets[j];
				var span2 = o2.offset + o2.length;
				if (o1.offset < o2.offset && span1 > span2) {
					r.contains.push(o2.id);
				} else if (o1.offset < o2.offset && span1 > o2.offset && span1 < span2) {
					r.overlaps.push(o2.id);
				} else if (o1.offset > o2.offset && span1 > span2 && span2 > o1.offset) {
					r.overlaps.push(o2.id);
				} else if (o1.offset < o2.offset && span1 < span2 && span1 > o2.offset) {
					r.overlaps.push(o2.id);
				}
			}
		}
		
		return relationships;
	};
	
	fm.loadDocumentFromUrl = function(docUrl) {
		currentDoc = docUrl;
		
		w.entities = {};
		w.structs = {};
		w.triples = [];
		
		$.ajax({
			url: docUrl,
			type: 'GET',
			success: _loadDocumentHandler,
			error: function(xhr, status, error) {
				currentDoc = null;
				w.d.show('message', {
					title: 'Error',
					msg: 'An error ('+status+') occurred and '+docUrl+' was not loaded.',
					type: 'error'
				});
			},
			dataType: 'xml'
		});
	};
	
	fm.loadDocument = function(docName) {
		currentDoc = docName;
		
		w.entities = {};
		w.structs = {};
		w.triples = [];
		
		$.ajax({
			url: w.baseUrl+'editor/documents/'+docName,
			type: 'GET',
			success: _loadDocumentHandler,
			error: function(xhr, status, error) {
				currentDoc = null;
				w.d.show('message', {
					title: 'Error',
					msg: 'An error ('+status+') occurred and '+docName+' was not loaded.',
					type: 'error'
				});
			},
			dataType: 'xml'
		});
	};
	
	/**
	 * Takes a document node and returns a string representation of its contents, compatible with the editor.
	 * Additionally creates w.structs entries.
	 * @param node An (X)HTML element
	 * @returns {String}
	 */
	fm.buildEditorString = function(node) {
		var editorString = '';
		
		function doBuild(currentNode) {
			var tag = currentNode.nodeName;
			if (tag == w.root) {
				editorString += '<'+tag.toLowerCase();
			} else {
				editorString += '<span';
			}
			editorString += ' _tag="'+tag+'"';
			
			// create structs entries while we build the string
			var id = $(currentNode).attr(w.idName);
			if (id == null) {
				id = tinymce.DOM.uniqueId('struct_');
				editorString += ' id="'+id+'"';
			}
			var idNum = parseInt(id.split('_')[1]);
			if (idNum > tinymce.DOM.counter) tinymce.DOM.counter = idNum;
			
			var canContainText = w.u.canTagContainText(tag);
			editorString += ' _textallowed="'+canContainText+'"';
			
			w.structs[id] = {
				id: id,
				_tag: tag,
				_textallowed: canContainText
			};
			$(currentNode.attributes).each(function(index, att) {
				var attName = att.name;
				if (attName == w.idName) attName = 'id';
				w.structs[id][attName] = att.value;
				if (attName == 'id' || attName.match(/^_/) != null) {
					editorString += ' '+attName+'="'+att.value+'"';
				}
			});
			editorString += '>';
			
			$(currentNode).contents().each(function(index, el) {
				if (el.nodeType == 1) {
					doBuild(el);
				} else if (el.nodeType == 3) {
					editorString += el.data;
				}
			});
			
			if (tag == w.root) {
				editorString += '</'+tag.toLowerCase()+'>';
			} else {
				editorString += '</span>';
			}
		}
		
		doBuild(node);
		return editorString;
	};
	
	var _loadDocumentHandler = function(doc) {
		var rootName;
		var isEvents = doc.getElementsByTagName('EVENTS').length > 0;
		if (isEvents) {
			rootName = 'events';
			w.idName = 'ID';
		} else {
			rootName = 'tei';
			w.idName = 'xml:id';
		}
		if (rootName != w.root.toLowerCase()) {
			if (rootName == 'events') {
				fm.loadSchema('xml/orlando_common_and_events_schema.xml', false, processDocument);
			} else {
				fm.loadSchema('xml/CWRCBasicTEI.xml', false, processDocument);
			}
		} else {
			processDocument();
		}
		
		function processDocument() {
			var offsets = [];
			
			var rdfs = $(doc).find('rdf\\:RDF, RDF');
			
			var docMode;
			var mode = parseInt(rdfs.find('w\\:mode, mode').first().text());
			if (mode == w.XML) {
				docMode = w.XML;
			} else {
				docMode = w.XMLRDF;
			}
			
			if (w.mode != docMode) {
				var editorModeStr = w.mode == w.XML ? 'XML only' : 'XML & RDF';
				var docModeStr = docMode == w.XML ? 'XML only' : 'XML & RDF';
				w.d.show('message', {
					title: 'Editor Mode changed',
					msg: 'The Editor Mode ('+editorModeStr+') has been changed to match the Document Mode ('+docModeStr+').',
					type: 'info'
				});
				
				w.mode = docMode;
			}
			
			if (docMode == w.XMLRDF) {
				rdfs.children().each(function(i1, el1) {
					var rdf = $(this);

					if (rdf.attr('rdf:ID')) {
						var id = rdf.find('w\\:id, id').text();
						
						var entity = rdf.find('w\\:entity, entity').text();
						// entity
						if (entity != '') {
							var idNum = parseInt(id.split('_')[1]);
							if (idNum > tinymce.DOM.counter) tinymce.DOM.counter = idNum;
							
							offsets.push({
								id: id,
								parent: rdf.find('w\\:parent, parent').text(),
								offset: parseInt(rdf.find('w\\:offset, offset').text()),
								length: parseInt(rdf.find('w\\:length, length').text())
							});
							w.entities[id] = {
								props: {
									id: id
								},
								info: {}
							};
							rdf.children('[type="props"]').each(function(i2, el2) {
								var key = $(this)[0].nodeName.split(':')[1].toLowerCase();
								var prop = $(this).text();
								if (key == 'content') {
									var title = w.u.getTitleFromContent(prop);
									w.entities[id]['props']['title'] = title;
								}
								w.entities[id]['props'][key] = prop;
							});
							rdf.children('[type="info"]').each(function(i2, el2) {
								var key = $(this)[0].nodeName.split(':')[1].toLowerCase();
								w.entities[id]['info'][key] = $(this).text();
							});
						} else {
							// struct
						}
						
					// triple
					} else if (rdf.attr('rdf:about')){
						var subject = $(this);
						var subjectUri = subject.attr('rdf:about');
						var predicate = rdf.children().first();
						var object = rdf.find('rdf\\:Description, Description');
						var objectUri = object.attr('rdf:about');
						
						var triple = {
							subject: {
								uri: subjectUri,
								text: subject.attr('w:external') == 'false' ? w.entities[subjectUri].props.title : subjectUri,
								external: subject.attr('w:external, external')
							},
							predicate: {
								text: predicate.attr('w:text'),
								name: predicate[0].nodeName.split(':')[1].toLowerCase(),
								external: predicate.attr('w:external')
							},
							object: {
								uri: objectUri,
								text: object.attr('w:external') == 'false' ? w.entities[objectUri].props.title : objectUri,
								external: object.attr('w:external')
							}
						};
						
						w.triples.push(triple);
					}
				});
				$(doc).find('rdf\\:RDF, RDF').remove();
			} else {
				function processEntities(parent, offsets) {
					var currentOffset = 0;
					parent.contents().each(function(index, element) {
						if (this.nodeType == Node.TEXT_NODE) {
							currentOffset += this.length;
						} else if (w.em.isEntity(this.nodeName.toLowerCase())) {
							var ent = $(this);
							var id = ent.attr(w.idName);
							if (id == null) {
								id = tinymce.DOM.uniqueId('ent_');
							}
							offsets.push({
								id: id,
								parent: $(parent).attr(w.idName),
								offset: currentOffset,
								length: ent.text().length
							});
							
							var content = ent.text();
							w.entities[id] = {
								props: {
									id: id,
									type: this.nodeName.toLowerCase(),
									content: content,
									title: w.u.getTitleFromContent(content)
								},
								info: {}
							};
							$(this.attributes).each(function(index, att) {
								w.entities[id].info[att.name] = att.value;
							});
							
							ent.contents().unwrap();
						} else {
							processEntities($(this), offsets);
						}
					});
				}
				processEntities($(doc.firstChild), offsets);
			}
			
			var root = doc.getElementsByTagName(w.root)[0];
			var editorString = fm.buildEditorString(root);
			w.editor.setContent(editorString);
			
			// editor needs focus in order for entities to be properly inserted
			w.editor.focus();
			
			var id, o, parent, contents, lengthCount, match, startOffset, endOffset, startNode, endNode;
			for (var i = 0; i < offsets.length; i++) {
				startNode = null;
				endNode = null;
				startOffset = 0;
				endOffset = 0;
				
				o = offsets[i];
				id = o.id;
				if (o.parent != '') {
					parent = w.editor.$('#'+o.parent);
					
					// get all text nodes
					contents = parent.contents().filter(function() {
						return this.nodeType == Node.TEXT_NODE;
					});
					
					startOffset = o.offset;
					lengthCount = 0;
					match = false;
					startNode = contents.filter(function() {
						if (!match) {
							lengthCount += this.length;
							if (lengthCount > o.offset) {
								match = true;
								return true;
							} else {
								startOffset -= this.length;
							}
						}
						return false;
					})[0];
					
					endOffset = o.offset+o.length;
					lengthCount = 0;
					match = false;
					endNode = contents.filter(function() {
						if (!match) {
							lengthCount += this.length;
							if (lengthCount >= o.offset+o.length) {
								match = true;
								return true;
							} else {
								endOffset -= this.length;
							}
						}
						return false;
					})[0];
				} else {
					parent = $(w.editor.getDoc().body);
					var currentOffset = 0;
					function getNodes(parent) {
						parent.contents().each(function(index, element) {
							if (this.nodeType == Node.TEXT_NODE && this.data != ' ') {
								currentOffset += this.length;
								if (currentOffset > o.offset && startNode == null) {
									startNode = this;
									startOffset = o.offset - (currentOffset - this.length);
								}
								
								if (currentOffset >= o.offset + o.length && endNode == null) {
									endNode = this;
									endOffset = startOffset + o.length;
								}
							} else {//if ($(this).is(w.root) || $(this).attr('_tag')) {
								getNodes($(this));
							}
							if (startNode != null && endNode != null) {
								return false;
							}
						});
					}
					
					getNodes(parent);
				}
				
				if (startNode != null && endNode != null) {
					var range = w.editor.selection.getRng(true);
					try {
						range.setStart(startNode, startOffset);
						range.setEnd(endNode, endOffset);
						w.insertBoundaryTags(id, w.entities[id].props.type, range);
					} catch (e) {
						
					}
				}
			}
			
			w.entitiesList.update();
			w.tree.update(true);
			w.relations.update();
		}
	};
	
	fm.editSource = function() {
		var docText = _exportDocument(true);
		$('textarea', edit).val(docText);
		edit.dialog('open');
	};
	

	fm.xmlToString = function(xmlData) {
		var xmlString = '';
		try {
			if (window.ActiveXObject) {
				xmlString = xmlData.xml;
			} else {
				xmlString = (new XMLSerializer()).serializeToString(xmlData);
			}
		} catch (e) {
			alert(e);
		}
		return xmlString;
	};
	
	/**
	 * Load a new schema.
	 * @param {String} url The url of the schema to load
	 * @param {Boolean} startText Whether to include the default starting text
	 * @param {Function} callback Callback for when the load is complete
	 */
	fm.loadSchema = function(url, startText, callback) {
		$.ajax({
			url: url,
			success: function(data, status, xhr) {
				w.schemaXML = data;
				
				var root = $('start', w.schemaXML).find('ref, element').first();
				var rootName = root.attr('name');
				if (root.is('element')) {
					w.root = rootName;
				} else {
					w.root = $('define[name="'+rootName+'"]', w.schemaXML).find('element').first().attr('name');
				}
				w.editor.settings.forced_root_block = w.root;
				w.editor.schema.addCustomElements(w.root);
			    w.editor.schema.addCustomElements(w.root.toLowerCase());
			    
			    var blockElements = w.editor.schema.getBlockElements();
			    var cssUrl;
			    if (w.root.toLowerCase() == 'events') {
			    	blockElements['L'] = {};
			    	blockElements['P'] = {};
			    	
			    	cssUrl = 'css/orlando_converted.css';
			    	w.validationSchema = 'events';
			    	w.header = 'ORLANDOHEADER';
			    	w.idName = 'ID';
			    } else {
			    	blockElements['l'] = {};
			    	blockElements['p'] = {};
			    	blockElements['sp'] = {};
			    	
			    	cssUrl = 'css/tei_converted.css';
			    	w.validationSchema = 'cwrcbasic';
			    	w.header = 'teiHeader';
			    	w.idName = 'xml:id';
			    }
			    
			    $('#schemaTags', w.editor.dom.doc).remove();
			    $('#schemaRules', w.editor.dom.doc).remove();
			    fm.loadSchemaCSS(cssUrl);
			    
			    // create css to display schema tags
				$('head', w.editor.dom.doc).append('<style id="schemaTags" type="text/css" />');
				var tag = w.root;
				// xhtml only allows lower case elements
				var schemaTags = w.root.toLowerCase()+' { display: block; }';
				schemaTags += '.showStructBrackets '+w.root.toLowerCase()+':before { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "<'+tag+'>"; }';
				schemaTags += '.showStructBrackets '+w.root.toLowerCase()+':after { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "</'+tag+'>"; }';
				var elements = [];
				$('element', w.schemaXML).each(function(index, el) {
					var tag = $(el).attr('name');
					if (elements.indexOf(tag) == -1) {
						elements.push(tag);
						schemaTags += '.showStructBrackets span[_tag='+tag+']:before { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "<'+tag+'>"; }';
						schemaTags += '.showStructBrackets span[_tag='+tag+']:after { color: #aaa; font-weight: normal; font-style: normal; font-family: monospace; content: "</'+tag+'>"; }';
					}
				});
				// hide the header
				schemaTags += 'span[_tag='+w.header+'] { display: none !important; }';
				
				$('#schemaTags', w.editor.dom.doc).text(schemaTags);
			    
				w.schema.elements = elements;
				
				var text = '';
				if (startText) text = 'Paste or type your text here.';
				w.editor.setContent('<'+w.root+' _tag="'+w.root+'">'+text+'</'+w.root+'>');
				
				w.entitiesList.update();
				w.tree.update(true);
				w.relations.update();
				
				if (callback) callback();
			},
			error: function(xhr, status, error) {
				w.d.show('message', {title: 'Error', msg: 'Error loading schema: '+error, type: 'error'});
			}
		});
	};
	
	fm.loadSchemaCSS = function(url) {
		w.editor.dom.loadCSS(url);
		if (url.match('converted') != null) {
			// already converted so exit
			return;
		}
		var name = url.split('/');
		name = name[name.length-1];
		var numCss = w.editor.getDoc().styleSheets.length;
		var cssInt = null;
		function parseCss() {
			var stylesheet = null;
			var stylesheets = w.editor.getDoc().styleSheets;
			for (var i = 0; i < stylesheets.length; i++) {
				var s = stylesheets[i];
				if (s.href && s.href.indexOf(name) != -1) {
					stylesheet = s;
					break;
				}
			}
			if (stylesheet) {
				try {
					$('#schemaRules', w.editor.dom.doc).remove();
					
					var rules = stylesheet.cssRules;
					var newRules = '';
					// adapt the rules to our format, should only modify element names in selectors
					for (var i = 0; i < rules.length; i++) {
						// chrome won't get proper selector, see: https://code.google.com/p/chromium/issues/detail?id=67782
						var selector = rules[i].selectorText;
						var newSelector = selector.replace(/(^|,|\s)(\w+)/g, function(str, p1, p2, offset, s) {
							return p1+'span[_tag="'+p2+'"]';
						});
						var css = rules[i].cssText;
						var newCss = css.replace(selector, newSelector);
						newRules += newCss+'\n';
					}
					$('head', w.editor.dom.doc).append('<style id="schemaRules" type="text/css" />');
					$('#schemaRules', w.editor.dom.doc).text(newRules);
					stylesheet.disabled = true;
				} catch (e) {
					setTimeout(parseCss, 25);
				}
			} else {
				setTimeout(parseCss, 25);
			}
		};
		if (numCss > 0) {
			parseCss();
		} else {
			cssInt = setInterval(function() {
				var len = w.editor.getDoc().styleSheets.length;
				if (len > numCss) {
					clearInterval(cssInt);
					parseCss();
				}
			}, 25);
		}
	};
	
	fm.loadInitialDocument = function(start) {
		if (start.match('load')) {
			fm.openLoader();
		} else if (start.match('sample_letter')) {
			_loadTemplate('xml/sample_letter.xml');
		} else if (start.match('sample_poem')) {
			_loadTemplate('xml/sample_poem.xml');
		} else if (start.match('event')) {
			_loadTemplate('xml/event_template.xml');
		} else if (start.match('letter')) {
			_loadTemplate('xml/letter_template.xml');
		} else if (start.match('poem')) {
			_loadTemplate('xml/poem_template.xml');
		} else if (start.match('prose')) {
			_loadTemplate('xml/prose_template.xml');
		} else {
			fm.loadSchema('xml/CWRCBasicTEI.xml', true);
		}
	};
	
	var _loadTemplate = function(url) {
		$.ajax({
			url: url,
			dataType: 'xml',
			success: function(data, status, xhr) {
				var rdf = data.createElement('rdf:RDF');
				var root;
				if (data.childNodes) {
					root = data.childNodes[data.childNodes.length-1];
				} else {
					root = data.firstChild;
				}
				$(root).prepend(rdf);
				_loadDocumentHandler(data);
			}
		});
	};
	
	return fm;
};

//cross browser xml node finder
//http://www.steveworkman.com/html5-2/javascript/2011/improving-javascript-xml-node-finding-performance-by-2000/
$.fn.filterNode = function(name) {
	return this.find('*').filter(function() {
		return this.nodeName === name;
	});
};var StructureTree = function(config) {
	
	var w = config.writer;
	
	var tree = {};
	
	var ignoreSelect = false; // used when we want to highlight a node without selecting it's counterpart in the editor

	$(config.parentId).append('<div id="structure"><div id="tree"></div></div>');
	$(document.body).append('<div id="tree_popup"></div>');
	
	$('#tree').jstree({
		core: {},
		themeroller: {},
		ui: {
			select_limit: 1
		},
		json_data: {
			data: {
				data: 'Tags',
				attr: {id: 'root'},
				state: 'open'
			}
		},
		contextmenu: {
			select_node: true,
			show_at_node: false,
			items: function(node) {
				_hidePopup();
				if (node.attr('id') == 'root') return {};
				
				var parentNode = node.parents('li:first');
				
				var info = w.structs[node.attr('name')];

				if (info._tag == w.root || info._tag == w.header) return {};
				
				var parentInfo = w.structs[parentNode.attr('name')];
				
				var validKeys = w.editor.execCommand('getChildrenForTag', {tag: info._tag, type: 'element', returnType: 'object'});
				var parentKeys = w.editor.execCommand('getParentsForTag', info._tag);
				var siblingKeys = {};
				if (parentInfo) {
					siblingKeys = w.editor.execCommand('getChildrenForTag', {tag: parentInfo._tag, type: 'element', returnType: 'object'});
				}
				
				function getSubmenu(keys) {
					var inserts = {};
					var inserted = false;
					for (var key in keys) {
						inserted = true;
						var doc = $('a\\:documentation, documentation', keys[key].element).first();
						if (doc.length == 1) {
							doc = doc.text();
						} else {
							doc = key;
						}
						inserts[key] = {
							label: '<span title="'+doc+'">'+key+'</span>',
							icon: 'img/tag_blue.png',
							action: function(obj) {
								var actionType = obj.parents('li.submenu').children('a').attr('rel');
								var key = obj.text();
								var pos = {
									x: parseInt($('#tree_popup').css('left')),
									y: parseInt($('#tree_popup').css('top'))
								};
								if (actionType == 'change') {
									var id = $('#tree a.ui-state-active').closest('li').attr('name');
									w.editor.execCommand('changeTag', {key: key, pos: pos, id: id});
								} else {
									w.editor.currentBookmark = w.editor.selection.getBookmark(1);
									w.editor.execCommand('addSchemaTag', {key: key, pos: pos, action: actionType});
								}
							}
						};
					}
					if (!inserted) {
						inserts['no_tags'] = {
							label: 'No tags available.',
							icon: 'img/cross.png',
							action: function(obj) {}
						};
					}
					return inserts;
				}
				
				var submenu = getSubmenu(validKeys);
				var parentSubmenu = getSubmenu(parentKeys);
				var siblingSubmenu = getSubmenu(siblingKeys);
				

				var items = {
					'before': {
						label: 'Insert Tag Before',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						submenu: siblingSubmenu
					},
					'after': {
						label: 'Insert Tag After',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						submenu: siblingSubmenu
					},
					'around': {
						label: 'Insert Tag Around',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						submenu: parentSubmenu
					},
					'inside': {
						label: 'Insert Tag Inside',
						icon: 'img/tag_blue_add.png',
						_class: 'submenu',
						separator_after: true,
						submenu: submenu
					},
					'change': {
						label: 'Change Tag',
						icon: 'img/tag_blue_edit.png',
						_class: 'submenu',
						submenu: siblingSubmenu
					},
					'edit': {
						label: 'Edit Tag',
						icon: 'img/tag_blue_edit.png',
						action: function(obj) {
							var pos = {
								x: parseInt($('#tree_popup').css('left')),
								y: parseInt($('#tree_popup').css('top'))
							};
							w.editor.execCommand('editTag', obj.attr('name'), pos);
						}
					},
					'delete': {
						label: 'Remove Tag Only',
						icon: 'img/tag_blue_delete.png',
						action: function(obj) {
							w.removeStructureTag(obj.attr('name'));
						}
					},
					'delete_all': {
						label: 'Remove Tag and All Content',
						icon: 'img/tag_blue_delete.png',
						action: function(obj) {
							w.removeStructureTag(obj.attr('name'), true);
						}
					}
				};
				if (info._tag == w.root) {
					delete items['delete'];
					delete items['before'];
					delete items['after'];
					delete items['around'];
				}
				return items;
			}
		},
		hotkeys: {
			del: function(e) {
				if (this.is_selected()) {
					var node = this.get_selected();
					var id = node.attr('name');
					if (id) {
						w.removeStructureTag(id);
					}
				}
			},
			f2: false
		},
		plugins: ['json_data', 'ui', 'themeroller', 'contextmenu', 'hotkeys']
	});
	$('#tree').mousemove(function(e) {
		$('#tree_popup').offset({left: e.pageX+15, top: e.pageY+5});
	});
	$('#tree').bind('select_node.jstree', function(event, data) {
		if (!ignoreSelect) {
			var node = data.rslt.obj;
			var id = node.attr('name');
			if (id) {
				if (w.structs[id]._tag == w.header) {
					w.d.show('header');
				} else {
					w.selectStructureTag(id);
				}
			}
		}
		ignoreSelect = false;
	});
	$('#tree').bind('hover_node.jstree', function(event, data) {
		if ($('#vakata-contextmenu').css('visibility') == 'visible') return;
		
		var node = data.rslt.obj;
		
		if (node.attr('id') == 'root') return;
		
		var id = node.attr('name');
		var info = w.structs[id];
		var content = '<ul>';
		for (var key in info) {
			if (key.indexOf('_') != 0) {
				content += '<li>'+key+': '+info[key]+'</li>';
			}
		}
		content += '</ul>';
		_showPopup(content);
	});
	$('#tree').bind('dehover_node.jstree', function(event, data) {
		_hidePopup();
	});

	tree.update = function() {
		var body = w.editor.dom.select('body');
	//	$('#tree').jstree('_get_children').each(function(index, element) {
	//		$('#tree').jstree('delete_node', $(this));
	//	});
		$('#tree').jstree('delete_node', '#root');
		var root = $('#tree').jstree('create_node', $('#tree'), 'first', {
			data: 'Tags',
			attr: {id: 'root'},
			state: 'open'
		});
		_doUpdate($(body).children(), root);
	};

	var _doUpdate = function(children, nodeParent) {
		children.each(function(index, el) {
			var newChildren = $(this).children();
			var newNodeParent = nodeParent;
			if ($(this).attr('_tag') || $(this).is(w.root)) {
				var id = $(this).attr('id');
				var isLeaf = $(this).find('[_tag]').length > 0 ? 'open' : null;
				if ($(this).attr('_tag') == w.header) isLeaf = false;
				
				// new struct check
				if (id == '' || id == null) {
					id = tinymce.DOM.uniqueId('struct_');
					var tag = $(this).attr('_tag');
					if (tag == null && $(this).is(w.root)) tag = w.root;
					if (w.schema.elements.indexOf(tag) != -1) {
						$(this).attr('id', id).attr('_tag', tag);
						w.structs[id] = {
							id: id,
							_tag: tag
						};
					}
				// redo/undo re-added a struct check
				} else if (w.structs[id] == null) {
					var deleted = w.deletedStructs[id];
					if (deleted != null) {
						w.structs[id] = deleted;
						delete w.deletedStructs[id];
					}
				// duplicate struct check
				} else {
					var match = w.editor.$('[id='+id+']');
					if (match.length > 1) {
						match.each(function(index, el) {
							if (index > 0) {
								var newStruct = $(el);
								var newId = tinymce.DOM.uniqueId('struct_');
								newStruct.attr('id', newId);
								w.structs[newId] = {};
								for (var key in w.structs[id]) {
									w.structs[newId][key] = w.structs[id][key];
								}
								w.structs[newId].id = newId;
							}
						});
					}
				}
				
				var info = w.structs[id];
				if (info) {
					var title = info._tag;
					newNodeParent = $('#tree').jstree('create_node', nodeParent, 'last', {
						data: title,
						attr: {name: id, 'class': $(this).attr('class')},
						state: isLeaf
					});
				}
			}
			if ($(this).attr('_tag') != w.header) {
				_doUpdate(newChildren, newNodeParent);
			}
		});
	};
	
	tree.selectNode = function(id) {
		if (id) {
			ignoreSelect = true;
			var result = $('#tree').jstree('select_node', $('#tree [name="'+id+'"]'), true);
			if (result.attr('id') == 'tree') ignoreSelect = false;
		}
	};
	
	var _showPopup = function(content) {
		$('#tree_popup').html(content).show();
	};
	
	var _hidePopup = function() {
		$('#tree_popup').hide();
	};
	
	return tree;
};var EntitiesList = function(config) {
	
	var w = config.writer;
	
	var entitiesList = {};
	
	$(config.parentId).append('<div id="entities"><div id="sortBy"><span>Sort By</span> <input type="radio" id="sequence" name="sortBy" checked="checked"><label for="sequence">Sequence</label></input><input type="radio" id="category" name="sortBy"><label for="category">Category</label></input></div><ul class="entitiesList"></ul></div>');
	$(document.body).append(''+
		'<div id="entitiesMenu" class="contextMenu" style="display: none;"><ul>'+
		'<li id="editEntity"><ins style="background:url(img/tag_blue_edit.png) center center no-repeat;" />Edit Entity</li>'+
		'<li id="removeEntity"><ins style="background:url(img/cross.png) center center no-repeat;" />Remove Entity</li>'+
		'<li class="separator" id="copyEntity"><ins style="background:url(img/tag_blue_copy.png) center center no-repeat;" />Copy Entity</li>'+
		'</ul></div>'
	);
	
	$('#sequence').button().click(function() {
		w.entitiesList.update('sequence');
		w.highlightEntity(w.editor.currentEntity);
	});
	$('#category').button().click(function() {
		w.entitiesList.update('category');
		w.highlightEntity(w.editor.currentEntity);
	});
	$('#sortBy').buttonset();
	
	entitiesList.update = function(sort) {
		if (sort == null) {
			if ($('#sequence').prop('checked')) {
				sort = 'sequence';
			} else {
				sort = 'category';
			}
		}
		
		$('#entities > ul').empty(); // remove previous nodes and event handlers
		
		var id, entry, i;
		var entitiesString = '';
		
		var entityTags = w.editor.$('span[class~=start]');
		if (sort == 'category') {
			var categories = {};
			entityTags.each(function(index, el) {
				id = $(el).attr('name');
				if (w.entities[id] == null) {
					var deleted = w.deletedEntities[id];
					if (deleted != null) {
						w.entities[id] = deleted;
						entry = deleted;
						delete w.deletedEntities[id];
					} else {
						w.removeEntity(id);
						return;
					}
				} else {
					entry = w.entities[id];
				}
				if (categories[entry.props.type] == null) {
					categories[entry.props.type] = [];
				}
				categories[entry.props.type].push(entry);
			});
			var category;
			for (id in categories) {
				category = categories[id];
				for (i = 0; i < category.length; i++) {
					entry = category[i];
					entitiesString += _buildEntity(entry);
				}
			}
		} else if (sort == 'sequence') {
			entityTags.each(function(index, el) {
				id = $(this).attr('name');
				if (w.entities[id] == null) {
					var deleted = w.deletedEntities[id];
					if (deleted != null) {
						w.entities[id] = deleted;
						entry = deleted;
						delete w.deletedEntities[id];
					} else {
						w.removeEntity(id);
						return;
					}
				} else {
					entry = w.entities[id];
				}
				if (entry) {
					entityTags = entityTags.not('[name='+id+']');
					entitiesString += _buildEntity(entry);
				}
			});
		}
		
		$('#entities > ul').html(entitiesString);
		$('#entities > ul > li').hover(function() {
			if (!$(this).hasClass('selected')) {
				$(this).addClass('over');
			}
		}, function() {
			if (!$(this).hasClass('selected')) {
				$(this).removeClass('over');
			}
		}).mousedown(function(event) {
			$(this).removeClass('over');
			w.highlightEntity(this.getAttribute('name'), null, true);
		}).contextMenu('entitiesMenu', {
			bindings: {
				'editEntity': function(tag) {
					w.editTag($(tag).attr('name'));
				},
				'removeEntity': function(tag) {
					w.removeEntity($(tag).attr('name'));
				},
				'copyEntity': function(tag) {
					w.copyEntity($(tag).attr('name'));
				}
			},
			shadow: false,
			menuStyle: {
			    backgroundColor: '#FFFFFF',
			    border: '1px solid #D4D0C8',
			    boxShadow: '1px 1px 2px #CCCCCC',
			    padding: '0px'
			},
			itemStyle: {
				fontFamily: 'Tahoma,Verdana,Arial,Helvetica',
				fontSize: '11px',
				color: '#000',
				lineHeight: '20px',
				padding: '0px',
				cursor: 'pointer',
				textDecoration: 'none',
				border: 'none'
			},
			itemHoverStyle: {
				color: '#000',
				backgroundColor: '#DBECF3',
				border: 'none'
			}
		});
	};
	
	var _buildEntity = function(entity) {
		var infoString = '<ul>';
		var buildString = function(infoObject) {
			for (var infoKey in infoObject) {
				var info = infoObject[infoKey];
				if ($.isPlainObject(info)) {
					buildString(info);
				} else {
					infoString += '<li><strong>'+infoKey+'</strong>: '+info+'</li>';
				}
			}
		};
		buildString(entity.info);
		infoString += '</ul>';
		return '<li class="'+entity.props.type+'" name="'+entity.props.id+'">'+
			'<span class="box"/><span class="entityTitle">'+entity.props.title+'</span><div class="info">'+infoString+'</div>'+
		'</li>';
	};
	
	entitiesList.remove = function(id) {
		$('#entities li[name="'+id+'"]').remove();
	};
	
	return entitiesList;
};var EntitiesModel = function() {
	var entities = {
		person: {
			title: 'Person'
		},
		date: {
			title: 'Date'
		},
		place: {
			title: 'Place'
		},
		event: {
			title: 'Event'
		},
		org: {
			title: 'Organization'
		},
		citation: {
			title: 'Citation'
		},
		note: {
			title: 'Note',
			mapping: {
				cwrcbasic: '<note type="{{type}}" ana="{{content}}">{{editorText}}</note>'
			}
		},
		correction: {
			title: 'Correction',
			mapping: {
				cwrcbasic: '<sic><corr cert="{{certainty}}" type="{{type}}" ana="{{content}}">{{editorText}}</corr></sic>',
				events: '<SIC CORR="{{content}}">{{editorText}}</SIC>'
			}
		},
		keyword: {
			title: 'Keyword',
			mapping: {
				cwrcbasic: '<keywords scheme="http://classificationweb.net"><term sameAs="{{id|keyword}}" type="{{type}}">{{editorText}}</term></keywords>'
			}
		},
		link: {
			title: 'Link',
			mapping: {
				cwrcbasic: '<ref target="{{url}}">{{editorText}}</ref>',
				events: '<XREF URL="{{url}}">{{editorText}}</XREF>'
			}
		},
		title: {
			title: 'Text/Title'
		}
	};
	
	function doMapping(entity, map) {
		return map.replace(/{{(.*?)}}/g, function(match, p1) {
			if (/\|/.test(p1)) {
				var infoKeys = p1.split('|');
				for (var i = 0; i < infoKeys.length; i++) {
					var key = infoKeys[i];
					if (entity.info[key]) {
						return entity.info[key];
					}
				}
			} else if (entity.info[p1]) {
				return entity.info[p1];
			} else if (p1 == 'editorText') {
				return entity.props.content;
			}
		});
	}
	
	var em = {};
	em.isEntity = function(type) {
		return entities[type] == null;
	};
	em.getTitle = function(type) {
		var e = entities[type];
		if (e) {
			return e.title;
		}
		return null;
	};
	em.getMapping = function(entity, schema) {
		var e = entities[entity.props.type];
		if (e) {
			if (e.mapping && e.mapping[schema]) {
				var mappedString = doMapping(entity, e.mapping[schema]);
				return mappedString;
			}
		}
		return null;
	};
	// returns the mapping as an array of opening and closing tags
	em.getMappingTags = function(entity, schema) {
		var e = entities[entity.props.type];
		if (e) {
			if (e.mapping && e.mapping[schema]) {
				var tags = [];
				var maps = e.mapping[schema].split('{{editorText}}');
				for (var i = 0; i < maps.length; i++) {
					tags.push(doMapping(entity, maps[i]));
				}
				return tags;
			}
		}
		return null;
	};
	
	return em;
};var Relations = function(config) {
	
	var w = config.writer;
	
	$(config.parentId).append('<div id="relations"><ul class="relationsList"></ul></div>');
	$(document.body).append(''+
		'<div id="relationsMenu" class="contextMenu" style="display: none;"><ul>'+
		'<li id="removeRelation"><ins style="background:url(img/cross.png) center center no-repeat;" />Remove Relation</li>'+
		'</ul></div>'
	);
	
	var relations = {};
	
	relations.update = function() {
		$('#relations ul').empty();
		
		var relationsString = '';
		
		for (var i = 0; i < w.triples.length; i++) {
			var triple = w.triples[i];
			relationsString += '<li>'+triple.subject.text+' '+triple.predicate.text+' '+triple.object.text+'</li>';
		}
		
		$('#relations ul').html(relationsString);
		
		$('#relations ul li').each(function(index, el) {
			$(this).data('index', index);
		}).contextMenu('relationsMenu', {
			bindings: {
				'removeRelation': function(r) {
					var i = $(r).data('index');
					w.triples.splice(i, 1);
					relations.update();
				}
			},
			shadow: false,
			menuStyle: {
			    backgroundColor: '#FFFFFF',
			    border: '1px solid #D4D0C8',
			    boxShadow: '1px 1px 2px #CCCCCC',
			    padding: '0px',
			    width: '105px'
			},
			itemStyle: {
				fontFamily: 'Tahoma,Verdana,Arial,Helvetica',
				fontSize: '11px',
				color: '#000',
				lineHeight: '20px',
				padding: '0px',
				cursor: 'pointer',
				textDecoration: 'none',
				border: 'none'
			},
			itemHoverStyle: {
				color: '#000',
				backgroundColor: '#DBECF3',
				border: 'none'
			}
		});
	};
	
	return relations;
};var Validation = function(config) {
	
	var w = config.writer;
	
	$(config.parentId).append('<div id="validation"><button>Validate</button><button>Clear</button><ul class="validationList"></ul></div>');
	
	$('#validation button:eq(0)').button().click(function() {
		w.fm.validate();
	});
	$('#validation button:eq(1)').button().click(function() {
		$('#validation > ul').empty();
	});
	
	var validation = {};
	
	/**
	 * Processes a validation response from the server.
	 * @param resultDoc The actual response
	 * @param docString The doc string sent to the server for validation  
	 */
	validation.showValidationResult = function(resultDoc, docString) {
		var list = $('#validation > ul');
		list.empty();
		
		docString = docString.split('\n')[1]; // remove the xml header
		
		var status = $('status', resultDoc).text();
		
		if (status == 'pass') {
			list.append(''+
				'<li class="ui-state-default">'+
					'<span class="ui-icon ui-icon-check" style="float: left; margin-right: 4px;"></span>Your document is valid!'+
				'</li>');
		}
		
		$('error, warning', resultDoc).each(function(index, el) {
			var type = el.nodeName;
			var id = '';
			var message = $(this).find('message').text();
			
			var column = parseInt($(this).find('column').text());
			if (!isNaN(column)) {
				var docSubstring = docString.substring(0, column);
				var tags = docSubstring.match(/<.*?>/g);
				var tag = tags[tags.length-1];
				id = tag.match(/id="(.*?)"/i)[1];
			}
			
			var item = list.append(''+
				'<li class="'+(type=='error'?'ui-state-error':'ui-state-highlight')+'">'+
					'<span class="ui-icon '+(type=='error'?'ui-icon-alert':'ui-icon-info')+'" style="float: left; margin-right: 4px;"></span>'+message+
				'</li>'
			).find('li:last');
			item.data('id', id);
		});
		
		list.find('li').click(function() {
			var id = $(this).data('id');
			if (id) {
				w.selectStructureTag(id);
			}
		});
		
		w.layout.center.children.layout1.open('south');
	};
	
	return validation;
};