var SettingsDialog = function(writer, config) {
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
};