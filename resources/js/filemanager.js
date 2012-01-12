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
					fm.saveDocument();
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
				var newDoc = $('#editDocLoader').contents().clone()[0];
				_loadDocumentHandler(newDoc);
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
		w.highlightStructureTag();
		
		var doc = w.editor.getDoc();
		var originalDoc = $(doc.body).clone(false, true); // make a copy, don't clone body events, but clone child events
		var head, content, exportText;
		if (w.mode == w.XMLRDF) {
			var offsets = [];
			_getNodeOffsets($(doc.body), offsets);
			$(doc.body).find('entity').remove();
			head = '<?xml version="1.0"?><html><head><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:w="http://cwrctc.artsrn.ualberta.ca/#">';
			content = '\n<body>\n'+w.editor.getContent()+'\n</body>\n</html>';
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
			head += '</rdf:RDF></head>';
			exportText = head + content;
		} else {
			head = '<?xml version="1.0"?><html><head></head>';
			for (var id in w.entities) {
				var markers = w.editor.dom.select('entity[name="'+id+'"]');
				var start = markers[0];
				var end = markers[1];
				
				var nodes = [start];
				var currentNode = start;
				while (currentNode != end  && currentNode != null) {
					currentNode = currentNode.nextSibling;
					nodes.push(currentNode);
				}
				
				var attributes = ' type="'+w.entities[id].props.type+'"';
				for (var key in w.entities[id].info) {
					attributes += ' '+key+'="'+w.entities[id].info[key]+'"';
				}
				
				w.editor.$(nodes).wrapAll('<entity'+attributes+'/>');
				w.editor.$(markers).remove();
			}
			content = '\n<body>\n'+w.editor.getContent({format: 'raw'})+'\n</body>\n</html>';
			exportText = head + content;
		}
		$(doc.body).replaceWith(originalDoc);
		return exportText;
	};
	
	var _getNodeOffsets = function(parent, offsets) {
		var currentOffset = 0;
		parent.contents().each(function(index, element) {
			if (this.nodeType == Node.TEXT_NODE) {
				currentOffset += this.length;
			} else if ($(this).is('struct, p')) {
				_getNodeOffsets($(this), offsets);
			} else if ($(this).is('entity[class*=start]')) {
				var id = $(this).attr('name');
				offsets.push({
					id: id,
					parent: $(parent).attr('id'),
					offset: currentOffset,
					length: w.entities[id].props.content.length
				});
			}
		});
	};
	
	fm.loadDocument = function(docName) {
		currentDoc = docName;
		
		w.entities = {};
		w.structs = {};
		
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
		var offsets = {};
		
		var maxId = 0; // track what the largest id num is
		
		var rdfs = $(doc).find('rdf\\:RDF');
		
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
		
		rdfs.children().each(function(i1, el1) {
			var id = $(this).find('w\\:id').text();
			
			var idNum = parseInt(id.split('_')[1]);
			if (idNum > maxId) maxId = idNum;
			
			offsets[id] = {
				parent: $(this).find('w\\:parent').text(),
				offset: parseInt($(this).find('w\\:offset').text()),
				length: parseInt($(this).find('w\\:length').text())
			};
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
		});
		$(doc).find('rdf\\:RDF').remove();
		
		var body = doc.getElementsByTagName('body')[0];
		var xmlString = '';
		try {
			if (window.ActiveXObject) {
				xmlString = body.xml;
			} else {
			   xmlString = (new XMLSerializer()).serializeToString(body);
			}
		} catch (e) {
			alert(e);
		}
		w.editor.setContent(xmlString);
		
		var id, o, range, contents, lengthCount, match, startOffset, endOffset, startNode, endNode;
		for (id in offsets) {
			// get all text nodes
			o = offsets[id];
			contents = w.editor.$('#'+o.parent).contents().filter(function() {
				return this.nodeType == Node.TEXT_NODE;
			});
			
			startOffset = o.offset;
			lengthCount = 0;
			match = false;
			startNode = contents.filter(function() {
				if (!match) {
					lengthCount += this.length;
					if (lengthCount >= o.offset) {
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
	};
	
	fm.editSource = function() {
		var docText = _exportDocument();
		$('textarea', edit).val(docText);
		edit.dialog('open');
	};
	
	return fm;
};