document.addEventListener("DOMContentLoaded", function(event) {
	if (document.documentElement.classList.contains('no-js')) { LoadError("Browser Not Supported"); return; }
	let options = {
		serviceurl: 'https://manifest.supplystudies.com/services/',
		hoverHighlight: false, retinaTiles: false, simpleLines: false, storyMap: false
	};
	MI = new Manifest(options);
	if (options.storyMap) { MI.Interface.Storyize(); }

	if (typeof(location.hash) !== 'undefined' && location.hash !== '') { 
		let hash = location.hash.substr(1).split("-"), hashtype = hash[0], hashid = [hash.shift(), hash.join('-')][1];
		if (hashtype === "collection") { LoadCollection(hashid, true); }
		else { 
			if (hashtype === 'gsheet' && hashid.toLowerCase().indexOf('https://docs.google.com/spreadsheets/d/') >= 0) { hashid = hashid.substring(39).split('/')[0]; }
			switch (hashtype) {
				case 'smap': fetch(MI.options.serviceurl + '?type=smap&id=' + hashid).then(r => r.json())
					.then(data => MI.Process('smap', data, {id: hashid, idref: hashid, url:MI.options.serviceurl + '?type=smap&id=' + hashid}))
					.then(r => Start()); break;
				case 'gsheet': fetch(MI.options.serviceurl + '?type=gsheet&id=' + hashid).then(r => r.json())
					.then(data => MI.Process('gsheet', data, {id: hashid.hashCode(), idref: hashid, url: MI.options.serviceurl + '?type=gsheet&id=' + hashid}))
					.then(r => Start()).catch(e => LoadError(e)); break;
				case 'manifest': fetch(hashid).then(r => r.json())
					.then(data => MI.Process('manifest', data, {id: (data.summary.name).hashCode(), url: hashid}))
					.then(r => Start()).catch(e => LoadError(e)); break;
				default: LoadError('Option not supported');
			}  LoadCollection("json/samples.json", false);
		}
	} else { 
		LoadIntroduction();  }

	function LoadError(msg) { 
		document.getElementById('loadermessage').innerHTML = '['+msg+']'; 
		document.getElementById('loadermessage').style.color = 'red';
		document.getElementById('loaderspinner').remove();
	}
	
	function LoadCollection(collection, start) {
		if (start) { 
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) ).then(starter => fetch(starter.url)
				.then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, url: starter.url, start:true})).then(r => Start())).catch(e => LoadError(e));
		} else {
			fetch(collection).then(c => c.json()) .then(data => LoadSample(data) );
		}		
	}
	
	function LoadIntroduction() {
		if (!MI.Interface.IsMobile()) {
			fetch("json/samples.json").then(c => c.json()).then(data => LoadSample(data) ).then(starter => fetch(starter.url)
				.then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, url:starter.url})).then(r => Start())).then(fetch("json/manifest.json")
				.then(r => r.json()).then(data => MI.Process('manifest', data, {id: ("json/manifest.json").hashCode(), url: "json/manifest.json", start:true}))
				.then(r => Start()))
				.catch(e => LoadError(e));
		} else {
		fetch("json/samples.json").then(c => c.json()).then(data => LoadSample(data) ).then(starter => fetch(starter.url)
			.then(s => s.json()).then(d => MI.Process(starter.type, d, {id: starter.id, url: starter.url, start:true})).then(r => Start())).catch(e => LoadError(e));
		}
	}
	//MI.functions.process("yeti", yeti, {"id": ("casper sleep").hashCode()});
	//	var starters = [5333,2239,602,5228,4532,2737,5228]; ... if(d.featured)


	function LoadSample(d) {
		document.getElementById('collection-description').innerHTML = d.description;
		for (var s in d.collection) { 
			let option = document.createElement('option');
			option.value = d.collection[s].id; option.innerHTML = d.collection[s].title;
			document.getElementById('load-samples-group').appendChild(option);
		} 
		let urloption =  document.createElement('option'), fileoption = document.createElement('option');
		urloption.value = 'url'; urloption.innerHTML = 'URL'; fileoption.value = 'file'; fileoption.innerHTML = 'FILE';
		document.getElementById('load-samples-custom').appendChild(urloption); document.getElementById('load-samples-custom').appendChild(fileoption);

		let starterstring =  d.collection[Math.floor(Math.random() * d.collection.length)].id.split("-"); 
		let startertype = starterstring[0], starterid = [starterstring.shift(), starterstring.join('-')][1];		
		return {url: (startertype === 'manifest') ? starterid : MI.options.serviceurl + "?type="+startertype+"&id=" + starterid, type:startertype, ref:starterid, id:((startertype !== 'smap') ? starterid.hashCode() : starterid)};
	}	
	
	function Start() {
	//	MI.Atlas.map.fitBounds(MI.Atlas.map.getBounds());
		MI.Atlas.map.setMaxBounds(new L.LatLngBounds(new L.LatLng(-85, 180), new L.LatLng(85, - 240)));
				
		if (MI.supplychains.length > 0) {
			if (MI.Atlas.active_point === null) { MI.Atlas.SetView(); }
			if (!(MI.initialized)) { MI.Interface.CleanupInterface(); }   
		}
		
		//MI.Messenger.AddObject(353136000);
		
	}
	
	// Do Testing
	// ManifestTests();
});	