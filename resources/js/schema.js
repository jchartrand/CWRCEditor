
[{
	"OrlandoHeader-element": {
	"elementName": "ORLANDOHEADER",
	"displayName": "OrlandoHeader-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false,
		"defaultValue": "TEXT"
	}]
},
	"fileDesc-element": {
	"elementName": "FILEDESC",
	"displayName": "fileDesc-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"titleStmt-element": {
	"elementName": "TITLESTMT",
	"displayName": "titleStmt-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"docTitle-element": {
	"elementName": "DOCTITLE",
	"displayName": "docTitle-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"soCalled-element": {
	"elementName": "SOCALLED",
	"displayName": "soCalled-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"rs-element": {
	"elementName": "RS",
	"displayName": "rs-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "key",
		"displayName": "KEY",
		"required": false
	},{
		"name": "reg",
		"displayName": "REG",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"docExtent-element": {
	"elementName": "DOCEXTENT",
	"displayName": "docExtent-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"publicationStmt-element": {
	"elementName": "PUBLICATIONSTMT",
	"displayName": "publicationStmt-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"authority-element": {
	"elementName": "AUTHORITY",
	"displayName": "authority-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"pubPlace-element": {
	"elementName": "PUBPLACE",
	"displayName": "pubPlace-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "key",
		"displayName": "KEY",
		"required": false
	},{
		"name": "reg",
		"displayName": "REG",
		"required": false
	}]
},
	"address-element": {
	"elementName": "ADDRESS",
	"displayName": "address-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "current",
		"displayName": "CURRENT",
		"required": false
	},{
		"name": "reg",
		"displayName": "REG",
		"required": false
	}]
},
	"addrLine-element": {
	"elementName": "ADDRLINE",
	"displayName": "addrLine-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"time-element": {
	"elementName": "TIME",
	"displayName": "time-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "value",
		"displayName": "VALUE",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	},{
		"name": "zone",
		"displayName": "ZONE",
		"required": false
	},{
		"name": "certainty",
		"displayName": "CERTAINTY",
		"required": false,
		"values": ["CERT", "C", "BY", "AFTER", "UNKNOWN", "ROUGHLYDATED"],
		"defaultValue": "CERT"
	}]
},
	"corr-element": {
	"elementName": "CORR",
	"displayName": "corr-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "sic",
		"displayName": "SIC",
		"required": false
	},{
		"name": "cert",
		"displayName": "CERT",
		"required": false
	},{
		"name": "resp",
		"displayName": "RESP",
		"required": true,
		"values": ["IMG", "SRF", "PDC", "KDC", "ANM", "CNM", "KJB", "TJB", "JAH", "MMM", "SSB", "SIB", "MEL", "JKW", "KKC", "PMB", "TTC", "KAH", "JAW", "SMH", "SYS", "HJM", "CEL", "JSC", "PHD", "AHM", "SJW", "JEB", "SLT", "BAA", "CJH", "JDS", "MEB", "NLG", "CLC", "GCG", "KNT", "JEC", "RSC", "SIR", "ECG", "SLB", "CAG", "MKB", "OSM", "DBH", "KGH", "JJD", "DRG", "NCK", "DLK", "AFP", "KLH", "CEE", "TRN", "RJR", "LMS", "JCA", "JES", "JLT", "KGS", "RJB", "DMH", "MAM", "LKD", "ARP", "KDM", "BJA", "SEV", "AJF", "AGH", "RTM", "LM2", "MRS", "KEH", "CLJ", "JCR", "TCD", "EAQ", "DEK", "BHL", "ALR", "SWK", "JLP", "ACF", "JSE", "MPO", "KCS", "ARC", "AEG", "AVU", "LJH", "KSN", "EWD", "CSK", "JBB", "PAD", "CMD", "CJG", "JRW", "MCA", "AWI", "SKR", "DHA", "SDU", "PIH", "GRA", "AAC", "EMH", "KGL", "NFS", "KME", "LSW"],
		"defaultValue": "IMG"
	}]
},
	"idno-element": {
	"elementName": "IDNO",
	"displayName": "idno-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"availability-element": {
	"elementName": "AVAILABILITY",
	"displayName": "availability-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "status",
		"displayName": "STATUS",
		"required": false
	}]
},
	"projectDesc-element": {
	"elementName": "PROJECTDESC",
	"displayName": "projectDesc-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"editorialDecl-element": {
	"elementName": "EDITORIALDECL",
	"displayName": "editorialDecl-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"sourceDesc-element": {
	"elementName": "SOURCEDESC",
	"displayName": "sourceDesc-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"revisionDesc-element": {
	"elementName": "REVISIONDESC",
	"displayName": "revisionDesc-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"responsibility-element": {
	"elementName": "RESPONSIBILITY",
	"displayName": "responsibility-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "resp",
		"displayName": "RESP",
		"required": true,
		"values": ["IMG", "SRF", "PDC", "KDC", "ANM", "CNM", "KJB", "TJB", "JAH", "MMM", "SSB", "SIB", "MEL", "JKW", "KKC", "PMB", "TTC", "KAH", "JAW", "SMH", "SYS", "HJM", "CEL", "JSC", "PHD", "AHM", "SJW", "JEB", "SLT", "BAA", "CJH", "JDS", "MEB", "NLG", "CLC", "GCG", "KNT", "JEC", "RSC", "SIR", "ECG", "SLB", "CAG", "MKB", "OSM", "DBH", "KGH", "JJD", "DRG", "NCK", "DLK", "AFP", "KLH", "CEE", "TRN", "RJR", "LMS", "JCA", "JES", "JLT", "KGS", "RJB", "DMH", "MAM", "LKD", "ARP", "KDM", "BJA", "SEV", "AJF", "AGH", "RTM", "LM2", "MRS", "KEH", "CLJ", "JCR", "TCD", "EAQ", "DEK", "BHL", "ALR", "SWK", "JLP", "ACF", "JSE", "MPO", "KCS", "ARC", "AEG", "AVU", "LJH", "KSN", "EWD", "CSK", "JBB", "PAD", "CMD", "CJG", "JRW", "MCA", "AWI", "SKR", "DHA", "SDU", "PIH", "GRA", "AAC", "EMH", "KGL", "NFS", "KME", "LSW"],
		"defaultValue": "IMG"
	},{
		"name": "workstatus",
		"displayName": "WORKSTATUS",
		"required": true,
		"values": ["SUB", "RWT", "CAS", "RBV", "CFT", "CFB", "CFC", "REV", "OLD", "PUB", "ENH"],
		"defaultValue": "SUB"
	},{
		"name": "workvalue",
		"displayName": "WORKVALUE",
		"required": true,
		"values": ["I", "P", "C", "O"],
		"defaultValue": "I"
	}]
},
	"item-element": {
	"elementName": "ITEM",
	"displayName": "item-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"l-element": {
	"elementName": "L",
	"displayName": "l-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "enjamb",
		"displayName": "ENJAMB",
		"required": false
	},{
		"name": "met",
		"displayName": "MET",
		"required": false
	},{
		"name": "real",
		"displayName": "REAL",
		"required": false
	},{
		"name": "rhyme",
		"displayName": "RHYME",
		"required": false
	},{
		"name": "part",
		"displayName": "PART",
		"required": true,
		"values": ["N", "Y", "I", "M", "F"],
		"defaultValue": "N"
	}]
},
	"lg-element": {
	"elementName": "LG",
	"displayName": "lg-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": true
	},{
		"name": "org",
		"displayName": "ORG",
		"required": true,
		"values": ["UNIFORM", "COMPOSITE"],
		"defaultValue": "UNIFORM"
	},{
		"name": "sample",
		"displayName": "SAMPLE",
		"required": true,
		"values": ["COMPLETE", "INITIAL", "MEDIAL", "FINAL", "UNKNOWN"],
		"defaultValue": "COMPLETE"
	},{
		"name": "part",
		"displayName": "PART",
		"required": true,
		"values": ["N", "Y", "I", "M", "F"],
		"defaultValue": "N"
	},{
		"name": "met",
		"displayName": "MET",
		"required": false
	},{
		"name": "real",
		"displayName": "REAL",
		"required": false
	},{
		"name": "rhyme",
		"displayName": "RHYME",
		"required": false
	}]
},
	"head-element": {
	"elementName": "HEAD",
	"displayName": "head-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"year-element": {
	"elementName": "YEAR",
	"displayName": "year-element",
	"attributes": [{
		"name": "value",
		"displayName": "VALUE",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"ocassion-element": {
	"elementName": "OCCASION",
	"displayName": "ocassion-element",
	"attributes": [{
		"name": "value",
		"displayName": "VALUE",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"season-element": {
	"elementName": "SEASON",
	"displayName": "season-element",
	"attributes": [{
		"name": "value",
		"displayName": "VALUE",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"month-element": {
	"elementName": "MONTH",
	"displayName": "month-element",
	"attributes": [{
		"name": "value",
		"displayName": "VALUE",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"week-element": {
	"elementName": "WEEK",
	"displayName": "week-element",
	"attributes": [{
		"name": "value",
		"displayName": "VALUE",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"day-element": {
	"elementName": "DAY",
	"displayName": "day-element",
	"attributes": [{
		"name": "value",
		"displayName": "VALUE",
		"required": false
	},{
		"name": "type",
		"displayName": "TYPE",
		"required": false
	}]
},
	"topic-element": {
	"elementName": "TOPIC",
	"displayName": "topic-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "standard",
		"displayName": "STANDARD",
		"required": false
	}]
},
	"Div0-element": {
	"elementName": "DIV0",
	"displayName": "Div0-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"Div1-element": {
	"elementName": "DIV1",
	"displayName": "Div1-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"chronStruct-element": {
	"elementName": "CHRONSTRUCT",
	"displayName": "chronStruct-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "chroncolumn",
		"displayName": "CHRONCOLUMN",
		"required": true,
		"values": ["NATIONALINTERNATIONAL", "BRITISHWOMENWRITERS", "WRITINGCLIMATE", "SOCIALCLIMATE"]
	},{
		"name": "relevance",
		"displayName": "RELEVANCE",
		"required": true,
		"values": ["SELECTIVE", "PERIOD", "DECADE", "COMPREHENSIVE"]
	},{
		"name": "chroncolumn1",
		"displayName": "CHRONCOLUMN1",
		"required": false,
		"values": ["NATIONALINTERNATIONAL1", "BRITISHWOMENWRITERS1", "WRITINGCLIMATE1", "SOCIALCLIMATE1"]
	},{
		"name": "chroncolumn2",
		"displayName": "CHRONCOLUMN2",
		"required": false,
		"values": ["NATIONALINTERNATIONAL2", "BRITISHWOMENWRITERS2", "WRITINGCLIMATE2", "SOCIALCLIMATE2"]
	},{
		"name": "chroncolumn3",
		"displayName": "CHRONCOLUMN3",
		"required": false,
		"values": ["NATIONALINTERNATIONAL3", "BRITISHWOMENWRITERS3", "WRITINGCLIMATE3", "SOCIALCLIMATE3"]
	},{
		"name": "relevance1",
		"displayName": "RELEVANCE1",
		"required": false,
		"values": ["SELECTIVE1", "PERIOD1", "DECADE1", "COMPREHENSIVE1"]
	},{
		"name": "relevance2",
		"displayName": "RELEVANCE2",
		"required": false,
		"values": ["SELECTIVE2", "PERIOD2", "DECADE2", "COMPREHENSIVE2"]
	},{
		"name": "relevance3",
		"displayName": "RELEVANCE3",
		"required": false,
		"values": ["SELECTIVE3", "PERIOD3", "DECADE3", "COMPREHENSIVE3"]
	}]
},
	"chronProse-element": {
	"elementName": "CHRONPROSE",
	"displayName": "chronProse-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"dataStruct-element": {
	"elementName": "DATASTRUCT",
	"displayName": "dataStruct-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"dataItem-element": {
	"elementName": "DATAITEM",
	"displayName": "dataItem-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"shortProse-element": {
	"elementName": "SHORTPROSE",
	"displayName": "shortProse-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"standard-element": {
	"elementName": "STANDARD",
	"displayName": "standard-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "wroteorpublishedas",
		"displayName": "WROTEORPUBLISHEDAS",
		"required": false
	}]
},
	"biogProse-element": {
	"elementName": "BIOGPROSE",
	"displayName": "biogProse-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"worksCited-element": {
	"elementName": "WORKSCITED",
	"displayName": "worksCited-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"source-element": {
	"elementName": "SOURCE",
	"displayName": "source-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"keywordClass-element": {
	"elementName": "KEYWORDCLASS",
	"displayName": "keywordClass-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "keywordtype",
		"displayName": "KEYWORDTYPE",
		"required": false
	}]
},
	"bibCits-element": {
	"elementName": "BIBCITS",
	"displayName": "bibCits-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	}]
},
	"sic-element": {
	"elementName": "SIC",
	"displayName": "sic-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "corr",
		"displayName": "CORR",
		"required": false
	}]
},
	"job-element": {
	"elementName": "JOB",
	"displayName": "job-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "familybusiness",
		"displayName": "FAMILYBUSINESS",
		"required": false,
		"defaultValue": "FAMILYBUSINESSYES"
	},{
		"name": "currentalternativeterm",
		"displayName": "CURRENTALTERNATIVETERM",
		"required": false
	},{
		"name": "historicalterm",
		"displayName": "HISTORICALTERM",
		"required": false
	},{
		"name": "historicaltermcontextdate",
		"displayName": "HISTORICALTERMCONTEXTDATE",
		"required": false
	},{
		"name": "reg",
		"displayName": "REG",
		"required": false
	}]
},
	"tGenre-element": {
	"elementName": "TGENRE",
	"displayName": "tGenre-element",
	"attributes": [{
		"name": "id",
		"displayName": "ID",
		"required": false,
		"dataType": "ID"
	},{
		"name": "genrename",
		"displayName": "GENRENAME",
		"required": false,
		"values": ["ABRIDGEMENT", "ACLEF", "ACROSTIC", "ADAPTATION", "ADVENTUREWRITING", "ADVERTISINGCOPY", "AFTERPIECE", "AFTERWORD", "AGITPROP", "ALLEGORY", "ALMANAC", "ANACREONTIC", "ANAGRAM", "ANNOTATION", "ANSWER", "ANTHEM", "ANTHOLOGY", "ANTIROMANCE", "APHORISM", "APOLOGY", "ARTCRITICISM", "AUTOBIOGRAPHY", "BALLAD", "BALLADE", "BALLADOPERA", "BALLET", "BERGAMASQUE", "BESTIARY", "BIBLICALPARAPHRASE", "BILDUNGSROMAN", "BIOGRAPHICALDICTIONARY", "BIOGRAPHY", "BISEXUALFICTION", "BLACKCOMEDY", "BOUTSRIMES", "BROADSIDE", "BURLETTA", "CABARET", "CAPTIVITYNARRATIVE", "CATECHISM", "CHAPBOOK", "CHARACTER", "CHARADE", "CHILDRENSLITERATURE", "CLERIHEW", "CLOSETDRAMA", "COLOURINGBOOK", "COMEDY", "COMEDYOFHUMOURS", "COMEDYOFINTRIGUE", "COMEDYOFMANNERS", "COMEDYOFMENACE", "COMICBOOK", "COMINGOUT", "COMMONPLACEBOOK", "COMPANION", "COMPUTERPROGRAM", "CONDITIONOFENGLANDNOVEL", "CONDUCTLITERATURE", "COOKBOOK", "COURTSHIPFICTION", "CRIMINOLOGY", "DEDICATION", "DETECTIVE", "DEVOTIONAL", "DIALOGUEORDEBATE", "DIARY", "DIALOGUEOFTHEDEAD", "DICTIONARY", "DIDACTIC", "DIRECTORY", "DISSERTATION", "DOCUMENTARY", "DOMESTIC", "DRAMA", "DRAMATICMONOLOGUE", "DREAMVISION", "DYSTOPIA", "ECLOGUE", "EDITING", "ELEGY", "ENCYCLOPAEDIA", "EPIC", "EPICTHEATRE", "EPIGRAM", "EPILOGUE", "EPISODICLITERATURE", "EPISTLE", "EPISTOLARY", "EPITAPH", "EPITHALAMIUM", "EPYLLION", "EROTICAPORNOGRAPHY", "ESSAY", "EULOGY", "EXHIBITIONCATALOGUE", "EXPRESSIONISTWRITING", "FABLE", "FABLIAU", "FAIRYTALE", "FANTASY", "FARCE", "FEMINIST", "FEMINISTTHEORY", "FICTION", "FILMTVSCRIPT", "FOLKSONG", "GARDENINGBOOK", "GENEALOGY", "GEORGIC", "GHOSTSTORY", "GIFTBOOK", "GOTHIC", "GOVERNMENTREPORT", "GRAMMAR", "GRAVEYARDPOETRY", "GUERILLATHEATRE", "GUIDEBOOK", "HAGIOGRAPHY", "HAIKU", "HARLEQUINADE", "HEROIC", "HISTORICAL", "HISTORY", "HYMN", "IMITATION", "IMPROVISATION", "INDUSTRIALNOVEL", "INTRODUCTION", "JOURNALISM", "JUVENILIA", "KITCHENSINKDRAMA", "KUNSTLERROMAN", "LAIS", "LAMPOON", "LEGALWRITING", "LEGENDFOLKTALE", "LESBIAN", "LETTER", "LETTERSFROMTHEDEADTOTHELIVING", "LIBRETTO", "LITERARYCRITICISM", "LITURGY", "LOVE", "LYRIC", "MAGICREALIST", "MANIFESTO", "MANUAL", "MAP", "MASQUE", "MEDICALWRITING", "MELODRAMA", "MIXEDMEDIA", "MOCKFORMS", "MONOLOGUE", "MORALITYMYSTERYPLAY", "MULTIMEDIA", "MUSICOLOGY", "MYSTERY", "MYTH", "NARRATIVEPOETRY", "NATIONALISTFICTION", "NATIONALTALE", "NOTEBOOK", "NOVEL", "NOVELLA", "NURSERYRHYME", "OBITUARY", "OCCASIONALPOETRY", "ODE", "ONEACTPLAY", "OPERA", "ORATORIO", "ORIENTAL", "PAGEANT", "PANEGYRIC", "PANTOMIME", "PARABLE", "PARATEXTS", "PARLIAMENTARYREPORT", "PARODY", "PASTORAL", "PEDAGOGY", "PERFORMANCEPOETRY", "PERIODICAL", "PETITION", "PHILOSOPHICAL", "PHILOSOPHY", "PICARESQUE", "PINDARIC", "POETRY", "POLEMIC", "POLITICALWRITING", "POPULAR", "PRAYER", "PREFATORYPIECE", "PROGRAMNOTES", "PROLETARIANWRITING", "PROLOGUE", "PROPAGANDA", "PROPHECY", "PSALM", "PSYCHOANALYTICAL", "QUIZ", "RADIODRAMA", "REALIST", "REGIONAL", "RELIGIOUS", "REVIEW", "REVUE", "RIDDLE", "ROMANCE", "SAGEWRITING", "SATIRE", "SCHOLARSHIP", "SCHOOLFICTION", "SCIENCEFICTION", "SCIENTIFICWRITING", "SCRAPBOOK", "SENSATIONNOVEL", "SENSIBILITY", "SENTIMENTAL", "SEQUEL", "SERMON", "SEXUALAWAKENINGFICTION", "SHORTSTORY", "SILVERFORKNOVEL", "SKETCH", "SKETCHBOOK", "SLAVENARRATIVE", "SOCIALSCIENCE", "SONG", "SONNET", "SPEECH", "STAGEREVIEW", "TESTIMONY", "TEXTBOOK", "THEATREOFCRUELTY", "THEATREOFTHEABSURD", "THEOLOGY", "THESAURUS", "THRILLER", "TOPOGRAPHICALPOETRY", "TRACTPAMPHLET", "TRAGEDY", "TRAGICOMEDY", "TRANSLATION", "TRAVELWRITING", "TREATISE", "UTOPIA", "VERSENOVEL", "VIGNETTE", "VILLANELLE", "YOUNGADULTWRITING"]
	},{
		"name": "proposedalternativename",
		"displayName": "PROPOSEDALTERNATIVENAME",
		"required": false
	}]
},
	"xptr-element": {
	"elementName": "XPTR",
	"displayName": "xptr-element",
	"attributes": [{
		"name": "date",
		"displayName": "DATE",
		"required": false
	},{
		"name": "doc",
		"displayName": "DOC",
		"required": false
	},{
		"name": "from",
		"displayName": "FROM",
		"required": true,
		"defaultValue": "ROOT"
	},{
		"name": "to",
		"displayName": "TO",
		"required": true,
		"defaultValue": "DITTO"
	},{
		"name": "url",
		"displayName": "URL",
		"required": false
	}]
},
	"xref-element": {
	"elementName": "XREF",
	"displayName": "xref-element",
	"attributes": [{
		"name": "date",
		"displayName": "DATE",
		"required": false
	},{
		"name": "doc",
		"displayName": "DOC",
		"required": false
	},{
		"name": "from",
		"displayName": "FROM",
		"required": true,
		"defaultValue": "ROOT"
	},{
		"name": "to",
		"displayName": "TO",
		"required": true,
		"defaultValue": "DITTO"
	},{
		"name": "url",
		"displayName": "URL",
		"required": false
	}]
}}];
