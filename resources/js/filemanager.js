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
		'<div id="entitiesConverter"></div>'+
		'<div id="editSourceDialog">'+
			'<textarea style="width: 100%; height: 98%;"></textarea>'+
		'</div>'+
		'<iframe id="editDocLoader" style="display: none;"></iframe>'
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
				var name = filenameInput.value;
				
				if (!_isNameValid(name)) {
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'You may only enter upper or lowercase letters; no numbers, spaces, or punctuation.'
					});
					return;
				} else if (name == 'info') {
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name is reserved, please choose a different one.'
					});
					return;
				}
				
				if ($.inArray(name, docNames) != -1) {
					// TODO add overwrite confirmation
					w.d.show('message', {
						title: 'Invalid Name',
						msg: 'This name already exists, please choose a different one.'
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
	var filenameInput = $('#saver input')[0];
	
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
				var newDocString = $('textarea', edit).val();
				$('#editDocLoader').contents().find('html').html(newDocString);
				w.entities = {};
				w.structs = {};
				_loadDocumentHandler($('#editDocLoader').contents()[0]);
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
			}, callback]
		});
//		var data = {
//			response: []
//		};
//		var length = Math.ceil(Math.random()*10);
//		for (var i = 0; i < length; i++) {
//			data.response.push('Random Doc '+i);
//		}
//		docNames = data.response;
//		if (callback) callback();
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
	
	var _isNameValid = function(name) {
		return name.match(/[^A-Za-z]+/) == null;
	};
	
	fm.validate = function(isSave) {
		var docText = _exportDocument();
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
				_validationHandler(data, isSave);
			},
			error: function() {
				w.d.show('message', {
					title: 'Error',
					msg: 'An error occurred while trying to validate '+currentDoc+'.'
				});
			}
		});
	};
	
	var _validationHandler = function(data, isSave) {
		if ($('status', data).text() != 'pass') {
			var errors = '<ul>';
			$('error', data).each(function(index, el) {
				errors += '<li>'+$(this).find('message').text()+'</li>';
			});
			errors += '</ul>';
			if (isSave) {
				w.d.confirm({
					title: 'Document Invalid',
					msg: currentDoc+' is not valid. <b>Save anyways?</b><br/>'+errors,
					callback: function(yes) {
						if (yes) {
							fm.saveDocument();
						}
					}
				});
			} else {
				w.d.show('message', {
					title: 'Document Invalid',
					msg: currentDoc+' is not valid.<br/>'+errors
				});
			}
		} else {
			if (isSave) {
				fm.saveDocument();
			} else {
				var warnings = '';
				if ($('warning', data).length > 0) {
					warnings += '<ul>';
					$('warning', data).each(function(index, el) {
						warnings += '<li>'+$(this).find('message').text()+'</li>';
					});
					warnings += '</ul>';
				}
				w.d.show('message', {
					title: 'Document Valid',
					msg: currentDoc+' is valid.<br/>'+warnings
				});
			}
		}
	};
	
	fm.saveDocument = function() {
		if (currentDoc == null) {
			fm.openSaver();
		} else {
			var docText = _exportDocument();
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
						msg: 'An error occurred and '+currentDoc+' was not saved.'
					});
				}
			});
		}
	};
	
	var _exportDocument = function() {
		// remove highlights
		w.highlightEntity();
		
		var doc = w.editor.getDoc();
		var originalDoc = $(doc.body).clone(false, true); // make a copy, don't clone body events, but clone child events
		
		_entitiesToUnicode(doc.body);
		
		var content, exportText;
		if (w.mode == w.XMLRDF) {
			var offsets = [];
			_getNodeOffsets($(doc.body), offsets);
			$(doc.body).find('[_entity]').remove();
			var head = '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:w="http://cwrctc.artsrn.ualberta.ca/#">';
			
			// entities
			for (var i = 0; i < offsets.length; i++) {
				var o = offsets[i];
				head += '\n<rdf:Description rdf:ID="'+o.id+'">';
				var key;
				for (key in o) {
					head += '\n<w:'+key+' type="offset">'+o[key]+'</w:'+key+'>';
				}
				var entry = w.entities[o.id];
				head += '\n<w:type type="props">'+entry.props.type+'</w:type>';
				head += '\n<w:content type="props">'+entry.props.content+'</w:content>';
				for (key in entry.info) {
					head += '\n<w:'+key+' type="info">'+entry.info[key]+'</w:'+key+'>';
				}
				head += '\n</rdf:Description>';
			}
			
			// triples
			for (var i = 0; i < w.triples.length; i++) {
				var t = w.triples[i];
				head += '\n<rdf:Description rdf:about="'+t.subject.uri+'" w:external="'+t.subject.external+'">'+
				'\n<w:'+t.predicate.name+' w:text="'+t.predicate.text+'" w:external="'+t.predicate.external+'">'+
				'\n<rdf:Description rdf:about="'+t.object.uri+'" w:external="'+t.object.external+'" />'+
				'\n</w:'+t.predicate.name+'>'+
				'\n</rdf:Description>';
			}
			
			head += '</rdf:RDF>';
			w.editor.$(w.root).prepend(head);
			exportText = w.editor.getContent({format: 'raw'});
//			exportText = head + content;
		} else {
			for (var id in w.entities) {
				var markers = w.editor.dom.select('[name="'+id+'"]');
				var start = markers[0];
				var end = markers[1];
				
				var nodes = [start];
				var currentNode = start;
				while (currentNode != end  && currentNode != null) {
					currentNode = currentNode.nextSibling;
					nodes.push(currentNode);
				}
				
				var attributes = ' id="'+id+'" type="'+w.entities[id].props.type+'"';
				for (var key in w.entities[id].info) {
					attributes += ' '+key+'="'+w.entities[id].info[key]+'"';
				}
				
				w.editor.$(nodes).wrapAll('<entity'+attributes+'/>');
				w.editor.$(markers).remove();
			}
			content = '\n'+w.editor.getContent({format: 'raw'});
			exportText = '<?xml version="1.0"?>' + content;
		}
		$(doc.body).replaceWith(originalDoc);
		return exportText;
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
	
	var _getNodeOffsets = function(parent, offsets) {
		var currentOffset = 0;
		parent.contents().each(function(index, element) {
			if (this.nodeType == Node.TEXT_NODE) {
				currentOffset += this.length;
			} else if ($(this).is(w.root) || $(this).attr('_struct')) {
				_getNodeOffsets($(this), offsets);
			} else if ($(this).attr('_entity') && $(this).hasClass('start')) {
				var id = $(this).attr('name');
				offsets.push({
					id: id,
					parent: $(parent).attr('id'),
					offset: currentOffset,
					length: w.entities[id].props.content.length
				});
			} else if (this.nodeName.toLowerCase() == 'entity') {
				var id = $(this).attr('id');
				offsets.push({
					id: id,
					parent: $(parent).attr('id'),
					offset: currentOffset,
					length: $(this).text().length
				});
			}
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
					msg: 'An error ('+status+') occurred and '+docName+' was not loaded.'
				});
			},
			dataType: 'xml'
		});
	};
	
	var _loadDocumentHandler = function(doc) {
		var offsets = [];
		
		var maxId = 0; // track what the largest id num is
		
		var rdfs = $(doc).find('rdf\\:RDF, RDF');
		
		var docMode;
		if (rdfs.length > 0) {
			docMode = w.XMLRDF;
		} else {
			docMode = w.XML;
		}
		
		if (w.mode != docMode) {
			var editorModeStr = w.mode == w.XML ? 'XML only' : 'XML & RDF';
			var docModeStr = docMode == w.XML ? 'XML only' : 'XML & RDF';
			w.d.show('message', {
				title: 'Warning',
				msg: 'The Editor Mode ('+editorModeStr+') has been changed to match the Document Mode ('+docModeStr+').'
			});
			
			w.mode = docMode;
		}
		
		if (docMode == w.XMLRDF) {
			rdfs.children().each(function(i1, el1) {
				// entity
				if ($(this).attr('rdf:ID')) {
					var id = $(this).find('w\\:id, id').text();
					
					var idNum = parseInt(id.split('_')[1]);
					if (idNum > maxId) maxId = idNum;
					
					offsets.push({
						id: id,
						parent: $(this).find('w\\:parent, parent').text(),
						offset: parseInt($(this).find('w\\:offset, offset').text()),
						length: parseInt($(this).find('w\\:length, length').text())
					});
					w.entities[id] = {
						props: {
							id: id
						},
						info: {}
					};
					$(this).children('[type="props"]').each(function(i2, el2) {
						var key = $(this)[0].nodeName.split(':')[1].toLowerCase();
						if (key == 'content') {
							var title = w.getTitleFromContent($(this).text());
							w.entities[id]['props']['title'] = title;
						}
						w.entities[id]['props'][key] = $(this).text();
					});
					$(this).children('[type="info"]').each(function(i2, el2) {
						var key = $(this)[0].nodeName.split(':')[1].toLowerCase();
						w.entities[id]['info'][key] = $(this).text();
					});
					
				// triple
				} else {
					var subject = $(this);
					var subjectUri = subject.attr('rdf:about');
					var predicate = $(this).children().first();
					var object = $(this).find('rdf\\:Description, Description');
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
			_getNodeOffsets($(doc.body), offsets);
			
			var ents = $(doc).find('entity');
			ents.each(function(index, el) {
				var ent = $(el);
				var id = ent.attr('id');
				var content = ent.text();
				w.entities[id] = {
					props: {
						id: id,
						type: ent.attr('type'),
						content: content,
						title: w.getTitleFromContent(content)
					},
					info: {}
				};
				$(el.attributes).each(function(index, att) {
					w.entities[id].info[att.name] = att.value;
				});
				
				ent.contents().unwrap();
			});
		}
		
		var root = doc.getElementsByTagName(w.root)[0];
		var xmlString = w.editor.serializer.serialize(root);
		w.editor.setContent(xmlString);
		
		var id, o, range, parent, contents, lengthCount, match, startOffset, endOffset, startNode, endNode;
		for (var i = 0; i < offsets.length; i++) {
			o = offsets[i];
			id = o.id;
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
			
			range = w.editor.selection.getRng(true);
			range.setStart(startNode, startOffset);
			range.setEnd(endNode, endOffset);
			w.insertBoundaryTags(id, w.entities[id].props.type, range);
		}
		
		w.editor.$(w.editor.getBody()).find('p, struct').each(function(index, element) {
			var id = this.getAttribute('id');
			
			// if id is null, an empty paragraph snuck in. it'll be dealt with when the structure tree gets updated.
			if (id != null) {
				var idNum = parseInt(id.split('_')[1]);
				if (idNum > maxId) maxId = idNum;
				
				w.structs[id] = {};
				for (var i = 0; i < this.attributes.length; i++) {
					var key = this.attributes[i].nodeName;
					var value = this.attributes[i].nodeValue;
					w.structs[id][key] = value;
				}
			}
		});
		
		// set the id counter so we don't get duplicate ids
		tinymce.DOM.counter = maxId+1;
		
		w.entitiesList.update();
		w.tree.update(true);
		w.relations.update();
	};
	
	fm.editSource = function() {
		var docText = _exportDocument();
		$('textarea', edit).val(docText);
		edit.dialog('open');
	};
	
	return fm;
};