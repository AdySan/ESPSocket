//Copyright (C) 2015 <>< Charles Lohr, see LICENSE file for more info.
//
//This particular file may be licensed under the MIT/x11, New BSD or ColorChord Licenses.

// var wsUri = "ws://" + location.host + ":81/";
// var wsUri = "ws://espsocket.local:81/";
var wsUri = "ws://192.168.1.5:81/";

var output;
var websocket;
var commsup = 0;

var mpfs_start_at = 1048576;
var flash_scratchpad_at = 524288;
var flash_blocksize = 65536;
var flash_sendsize = 256;
//Push objects that have:
// .request
// .callback = function( ref (this object), data );

var workqueue = [];
var wifilines = [];
var workarray = {};
var lastitem;

var SystemMessageTimeout = null;
function IssueSystemMessage( msg )
{
	var elem = $( "#SystemMessage" );
	elem.hide();
	elem.html(  "<font size=+2>" + msg + "</font>" );
	elem.fadeIn( 'slow' );
	if( SystemMessageTimeout != null ) clearTimeout(SystemMessageTimeout);
	SystemMessageTimeout = setTimeout( function() { SystemMessageTimeout = null; $( "#SystemMessage" ).fadeOut( 'slow' ) }, 3000 );
}

function QueueOperation( command, callback )
{
	if( workarray[command] == 1 )
	{
		return;
	}

	workarray[command] = 1;
	var vp = new Object();
	vp.callback = callback;
	vp.request = command;
	workqueue.push( vp );
}


function init()
{
	$('#MainMenu > tbody:first-child').before( "\
		<tr><td width=100%> \
		<input type=submit onclick=\"ShowHideEvent( 'SystemStatus' );\" value='System Status' id=SystemStatusClicker></td>\
		<td> \
		<div id=SystemStatus class='collapsible'> \
		<table width=100% border=1 style=\"border-collapse: collapse;\"><tr><td> \
		<div id=output> \n</td></tr></table></div></td></tr>" );

	$('#MainMenu > tbody:last-child').after( "\
		<tr><td width=1> \
		<input type=submit onclick=\"ShowHideEvent( 'WifiSettings' ); KickWifiTicker();\" value=\"Wifi Settings\"></td><td> \
		<div id=WifiSettings class=\"collapsible\"> \
		<table width=100% border=1 style=\"border-collapse: collapse;\"><tr><td> \
		Current Configuration: (May deviate from default configuration, reset here if in doubt)<form name=\"wifisection\" action=\"javascript:ChangeWifiConfig();\"> \
		<table border=1 width=1%> \
		<tr><td width=1>Type:</td><td><input type=\"radio\" name=\"wifitype\" value=1 onclick=\"ClickOpmode(1);\">Station (Connect to infrastructure)<br><input type=\"radio\" name=\"wifitype\" value=2 onclick=\"ClickOpmode(2);\">AP (Broadcast a new AP)</td></tr> \
		<tr><td>SSID:</td><td><input type=\"text\" id=\"wificurname\"></td></tr> \
		<tr><td>PASS:</td><td><input type=\"text\" id=\"wificurpassword\"></td></tr> \
		<tr><td>MAC:</td><td><input type=\"text\" id=\"wifimac\"> (Ignored in softAP mode)</td></tr> \
		<tr><td>Chan:</td><td><input type=\"text\" id=\"wificurchannel\"> (Ignored in Station mode)</td></tr></tr> \
		<tr><td></td><td><input type=submit value=\"Change Settings\"> (Automatically saves to flash)</td></tr> \
		</table></form> \
		Scanned Stations: \
		<div id=WifiStations></div> \
		<input type=submit onclick=\"ScanForWifi();\" value=\"Scan For Stations (Will disconnect!)\"> \
		</td></tr></table></div></td></tr> \
		 \
		<tr><td width=1> \
		<input type=submit onclick=\"ShowHideEvent( 'CustomCommand' );\" value=\"Custom Command\"></td><td> \
		<div id=CustomCommand class=\"collapsible\"> \
		<table width=100% border=1 style=\"border-collapse: collapse;\"><tr><td> \
		Command: <input type=text id=custom_command> \
		<input type=submit value=\"Submit\" onclick=\"IssueCustomCommand()\"><br> \
		<textarea id=custom_command_response readonly rows=15 cols=80></textarea> \
		</td></tr></table></td></tr> \
		 \
		<tr><td width=1> \
		<input type=submit onclick=\"ShowHideEvent( 'GPIOs' ); GPIODataTicker();\" value=\"GPIOs Digital\"></td><td> \
		<div id=GPIOs class=\"collapsible\"> \
		<table width=100% border=1 style=\"border-collapse: collapse;\"><tr> \
		<td align=center>D3<input type=button id=ButtonGPIO0 value=0 onclick=\"TwiddleGPIO(0);\"><input type=button id=BGPIOIn0 value=In onclick=\"GPIOInput(0);\" class=\"inbutton\"></td> \
		<td align=center>D10<input type=button id=ButtonGPIO1 value=0 onclick=\"TwiddleGPIO(1);\"><input type=button id=BGPIOIn1 value=In onclick=\"GPIOInput(1);\" class=\"inbutton\"></td> \
		<td align=center>D4<input type=button id=ButtonGPIO2 value=0 onclick=\"TwiddleGPIO(2);\"><input type=button id=BGPIOIn2 value=In onclick=\"GPIOInput(2);\" class=\"inbutton\"></td> \
		<td align=center>D9<input type=button id=ButtonGPIO3 value=0 onclick=\"TwiddleGPIO(3);\"><input type=button id=BGPIOIn3 value=In onclick=\"GPIOInput(3);\" class=\"inbutton\"></td> \
		<td align=center>D2<input type=button id=ButtonGPIO4 value=0 onclick=\"TwiddleGPIO(4);\"><input type=button id=BGPIOIn4 value=In onclick=\"GPIOInput(4);\" class=\"inbutton\"></td> \
		<td align=center>D1<input type=button id=ButtonGPIO5 value=0 onclick=\"TwiddleGPIO(5);\"><input type=button id=BGPIOIn5 value=In onclick=\"GPIOInput(5);\" class=\"inbutton\"></td> \
		<td>...</td> \
		<td align=center>D6<input type=button id=ButtonGPIO12 value=0 onclick=\"TwiddleGPIO(12);\"><input type=button id=BGPIOIn12 value=In onclick=\"GPIOInput(12);\" class=\"inbutton\"></td> \
		<td align=center>D7<input type=button id=ButtonGPIO13 value=0 onclick=\"TwiddleGPIO(13);\"><input type=button id=BGPIOIn13 value=In onclick=\"GPIOInput(13);\" class=\"inbutton\"></td> \
		<td align=center>D5<input type=button id=ButtonGPIO14 value=0 onclick=\"TwiddleGPIO(14);\"><input type=button id=BGPIOIn14 value=In onclick=\"GPIOInput(14);\" class=\"inbutton\"></td> \
		<td align=center>D8<input type=button id=ButtonGPIO15 value=0 onclick=\"TwiddleGPIO(15);\"><input type=button id=BGPIOIn15 value=In onclick=\"GPIOInput(15);\" class=\"inbutton\"></td> \
		</tr></table></div></td></tr>\
		\
		<tr><td width=1> \
		<input type=submit onclick=\"ShowHideEvent( 'GPIOAnalog' ); \" value=\"GPIOs Analog\"></td><td> \
		<div id=GPIOAnalog class=\"collapsible\"> \
		<table width=100% border=1 style=\"border-collapse: collapse;\"><tr> \
		</tr></table></div></td></tr>\
		\
		<tr><td width=1>\
		<input type=submit onclick=\"ShowHideEvent( 'SystemReflash' );\" value=\"System Reflash\"></td><td>\
		<div id=SystemReflash class=\"collapsible\">\
		<div id=\"dragandrophandler\">Drag & Drop Files Here</div>\
		<br><br>\
		<div id=\"status1\"></div>\
		</div></td></tr>\
");
		

	MakeDragDrop( "dragandrophandler" );

	//Preclude drag and drop on rest of document in event user misses firmware boxes.
	donothing = function(e) {e.stopPropagation();e.preventDefault();};
	$(document).on('drop', donothing );
	$(document).on('dragover', donothing );
	$(document).on('dragenter', donothing );

	output = document.getElementById("output");
	Ticker();

	KickWifiTicker();
	GPIODataTickerStart();
}

window.addEventListener("load", init, false);


function StartWebSocket()
{
	output.innerHTML = "Connecting...";
	if( websocket ) websocket.close();
	workarray = {};
	workqueue = [];
	lastitem = null;
	websocket = new WebSocket(wsUri, ['arduino']);
	websocket.onopen = function(evt) { onOpen(evt) };
	websocket.onclose = function(evt) { onClose(evt) };
	websocket.onmessage = function(evt) { onMessage(evt) };
	websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt)
{

//	websocket.send('Hello from ESP8266 ' + new Date()); 
	websocket.send('ping');

//	doSend('e' );
}

function onClose(evt)
{
	$('#SystemStatusClicker').css("color", "red" );
	commsup = 0;
}

var msg = 0;
var tickmessage = 0;
var lasthz = 0;
var time_since_hz = 0;
function Ticker()
{
	setTimeout( Ticker, 1000 );

	lasthz = (msg - tickmessage);
	tickmessage = msg;
	if( lasthz == 0 )
	{
		time_since_hz++;
		if( time_since_hz > 3)
		{
			$('#SystemStatusClicker').css("color", "red" );
			$('#SystemStatusClicker').prop( "value", "Offline" );
			if( commsup != 0 && !is_waiting_on_stations ) IssueSystemMessage( "WebSocket Connection Lost..." );
			commsup = 0;
			// console.log('Calling StartWebSocket');
			StartWebSocket();
		}
		else
			$('#SystemStatusClicker').prop( "value", "Online " + 0 + "Hz" );
	}
	else
	{
		time_since_hz = 0;
		$('#SystemStatusClicker').prop( "value", "Online " + lasthz + "Hz" );
	}
}

function onMessage(evt)
{
	msg++;

	if( commsup != 1 )
	{
		commsup = 1;
		$('#SystemStatusClicker').css("color", "green" );
		IssueSystemMessage( "WebSocket Connected!" );
	}


	if( lastitem )
	{
		if( lastitem.callback )
		{
			lastitem.callback( lastitem, evt.data );
			lastitem = null;
		}
	}
	else
	{
		output.innerHTML = "<p>Messages: " + msg + "</p><p>RSSI: " + evt.data.substr(0) + "</p>";	
	}


	if( workqueue.length )
	{
		var elem = workqueue.shift();
		delete workarray[elem.request];

		if( elem.request )
		{
			doSend( elem.request );
			lastitem = elem;
			return;
		}
	}

	doSend('wx'); //Request RSSI.
}

function onError(evt)
{
	$('#SystemStatusClicker').css("color", "red" );
	commsup = 0;
}

function doSend(message)
{
	websocket.send(message);
}

function IsTabOpen( objname )
{
	var obj = $( "#" + objname );
	var opened = obj.is( '.opened' );
	return opened != 0;
}

function ShowHideEvent( objname )
{
	var obj = $( "#" + objname );
	obj.slideToggle( 'fast' ).toggleClass( 'opened' );
	var opened = obj.is( '.opened' );
	localStorage["sh" + objname] = opened?1:0;
	return opened!=0;
}


function IssueCustomCommand()
{
	QueueOperation( $("#custom_command").val(), function( req,data) { $("#custom_command_response").val( data ); } );
}

function MakeDragDrop( divname )
{
var obj = $("#dragandrophandler");
obj.on('dragenter', function (e) 
{
    e.stopPropagation();
    e.preventDefault();
    $(this).css('border', '2px solid #0B85A1');
});
obj.on('dragover', function (e) 
{
     e.stopPropagation();
     e.preventDefault();
});
obj.on('drop', function (e) 
{
 
     $(this).css('border', '2px dotted #0B85A1');
     e.preventDefault();
     var files = e.originalEvent.dataTransfer.files;
 
     //We need to send dropped files to Server
     handleFileUpload(files,obj);
});
$(document).on('dragenter', function (e) 
{
    e.stopPropagation();
    e.preventDefault();
});
$(document).on('dragover', function (e) 
{
  e.stopPropagation();
  e.preventDefault();
  obj.css('border', '2px dotted #0B85A1');
});
$(document).on('drop', function (e) 
{
    e.stopPropagation();
    e.preventDefault();
});
 
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
///Below here are mostly just events...

did_wifi_get_config = false;
is_data_ticker_running = false;
is_waiting_on_stations = false;

function ScanForWifi()
{
	QueueOperation('WS', null);
	is_waiting_on_stations=true;
	IssueSystemMessage( "Scanning for Wifi..." );
}

function KickWifiTicker()
{
	if( !is_data_ticker_running )
		WifiDataTicker();
}

function BSSIDClick( i )
{
	var tlines = wifilines[i];
	document.wifisection.wifitype.value = 1;
	document.wifisection.wificurname.value = tlines[0].substr(1);
	document.wifisection.wificurpassword.value = "";
	document.wifisection.wifimac.value = tlines[1];
	document.wifisection.wificurchannel.value = 0;

	ClickOpmode( 1 );
	return false;
}

function ClickOpmode( i )
{
	if( i == 1 )
	{
		document.wifisection.wificurname.disabled = false;
		document.wifisection.wificurpassword.disabled = false;
		document.wifisection.wifimac.disabled = false;
		document.wifisection.wificurchannel.disabled = true;
	}
	else
	{
		document.wifisection.wificurname.disabled = false;
		document.wifisection.wificurpassword.disabled = true;
		document.wifisection.wificurpassword.value = "";
		document.wifisection.wifimac.disabled = true;
		document.wifisection.wificurchannel.disabled = false;
	}
}

function WifiDataTicker()
{
	if( IsTabOpen('WifiSettings') )
	{
		is_data_ticker_running = true;

		if( !did_wifi_get_config )
		{
			QueueOperation( "WI", function(req,data)
			{
				var params = data.split( "\t" );
			
				var opmode = Number( params[0].substr(2) );
				document.wifisection.wifitype.value = opmode;
				document.wifisection.wificurname.value = params[1];
				document.wifisection.wificurpassword.value = params[2];
				document.wifisection.wifimac.value = params[3];
				document.wifisection.wificurchannel.value = Number( params[4] );

				ClickOpmode( opmode );
				did_wifi_get_config = true;
			} );
		}

		QueueOperation( "WR", function(req,data) {
			var lines = data.split( "\n" );
			var innerhtml;

			if( lines.length < 3 )
			{
				innerhtml = "No APs found.  Did you scan?";
				if( is_waiting_on_stations )
				{
					IssueSystemMessage( "No APs found." );
					is_waiting_on_stations = false;
				}
			}
			else
			{
				if( is_waiting_on_stations )
				{
					IssueSystemMessage( "Scan Complete." );
					is_waiting_on_stations = false;
				}

				innerhtml = "<TABLE border=1><TR><TH>SSID</TH><TH>MAC</TH><TH>RS</TH><TH>Ch</TH><TH>Enc</TH></TR>"
				wifilines = [];
				for( i = 1; i < lines.length-1; i++ )
				{
					tlines = lines[i].split( "\t" );
					wifilines.push(tlines);
					var bssidval = "<a href='javascript:void(0);' onclick='return BSSIDClick(" + (i -1 )+ ")'>" + tlines[1];
					innerhtml += "<TR><TD>" + tlines[0].substr(1) + "</TD><TD>" + bssidval + "</TD><TD>" + tlines[2] + "</TD><TD>" + tlines[3] + "</TD><TD>" + tlines[4] + "</TD></TR>";
				}
			}
			innerhtml += "</TABLE>";
			document.getElementById("WifiStations").innerHTML = innerhtml;
		} );
		setTimeout( WifiDataTicker, 500 );
	}
	else
	{
		is_data_ticker_running = 0;
	}
}

function ChangeWifiConfig()
{
	
	var st = "W";
	st += document.wifisection.wifitype.value;
	st += "\t" + document.wifisection.wificurname.value;
	st += "\t" + document.wifisection.wificurpassword.value;
	st += "\t" + document.wifisection.wifimac.value;
	st += "\t" + document.wifisection.wificurchannel.value;
	QueueOperation( st );
	did_wifi_get_config = false;
}




function TwiddleGPIO( gp )
{
	var st = "GF";
	st += gp;
	QueueOperation( st );
}

function GPIOInput( gp )
{
	var st = "GI";
	st += gp;
	QueueOperation( st );
}

function GPIOUpdate(req,data) {
	var secs = data.split( "\t" );
	var op = 0;
	var m = Number(secs[1]); // bitmask for GPIO 0~15, in/out
	var n = Number(secs[2]); // bitmask for GPIO 0~15, HI/LO


	console.log("secs: " + secs + ", n: " + n + ", m: " + m);
 
	for( op = 0; op < 16; op++ )
	{
		var b = $( "#ButtonGPIO" + op );
		if( b )
		{
			if( 1<<op & n )
			{
				b.css("background-color","red" );
				b.css("color","black" );
				b.prop( "value", "1" );
			}
			else
			{
				b.css("background-color","black" );
				b.css("color","white" );
				b.prop( "value", "0" );
			}
		}

		b = $( "#BGPIOIn" + op );
		if( b )
		{
			if( 1<<op & m )
			{
				b.css("background-color","blue" );
				b.css("color","white" );
				b.attr( "value", "out" );
			}
			else
			{
				b.css("background-color","green" );
				b.css("color","white" );
				b.attr( "value", "in" );
			}
		}
	}
	if( IsTabOpen('GPIOs') )
	{
		QueueOperation( "GS", GPIOUpdate );
	}
}

function GPIODataTicker()
{
	if( !IsTabOpen('GPIOs') ) return;
	QueueOperation( "GS", GPIOUpdate );
	setTimeout( GPIODataTicker, 500 );
}


function GPIODataTickerStart()
{
	if( IsTabOpen('GPIOs') )
		GPIODataTicker();
}


// Grabbed this implementation from http://hayageek.com/drag-and-drop-file-upload-jquery/

function sendFileToServer(formData,status)
{
    var uploadURL ="http://adyesp8266.local/edit"; //Upload URL
    var extraData ={}; //Extra Data.
    var jqXHR=$.ajax({
            xhr: function() {
            var xhrobj = $.ajaxSettings.xhr();
            if (xhrobj.upload) {
                    xhrobj.upload.addEventListener('progress', function(event) {
                        var percent = 0;
                        var position = event.loaded || event.position;
                        var total = event.total;
                        if (event.lengthComputable) {
                            percent = Math.ceil(position / total * 100);
                        }
                        //Set progress
                        status.setProgress(percent);
                    }, false);
                }
            return xhrobj;
        },
    url: uploadURL,
    type: "POST",
    contentType:false,
    processData: false,
        cache: false,
        data: formData,
        success: function(data){
            status.setProgress(100);
 
            $("#status1").append("File upload Done<br>");         
        }
    }); 
 
    status.setAbort(jqXHR);
}
 
var rowCount=0;
function createStatusbar(obj)
{
     rowCount++;
     var row="odd";
     if(rowCount %2 ==0) row ="even";
     this.statusbar = $("<div class='statusbar "+row+"'></div>");
     this.filename = $("<div class='filename'></div>").appendTo(this.statusbar);
     this.size = $("<div class='filesize'></div>").appendTo(this.statusbar);
     this.progressBar = $("<div class='progressBar'><div></div></div>").appendTo(this.statusbar);
     this.abort = $("<div class='abort'>Abort</div>").appendTo(this.statusbar);
     obj.after(this.statusbar);
 
    this.setFileNameSize = function(name,size)
    {
        var sizeStr="";
        var sizeKB = size/1024;
        if(parseInt(sizeKB) > 1024)
        {
            var sizeMB = sizeKB/1024;
            sizeStr = sizeMB.toFixed(2)+" MB";
        }
        else
        {
            sizeStr = sizeKB.toFixed(2)+" KB";
        }
 
        this.filename.html(name);
        this.size.html(sizeStr);
    }
    this.setProgress = function(progress)
    {       
        var progressBarWidth =progress*this.progressBar.width()/ 100;  
        this.progressBar.find('div').animate({ width: progressBarWidth }, 10).html(progress + "% ");
        if(parseInt(progress) >= 100)
        {
            this.abort.hide();
        }
    }
    this.setAbort = function(jqxhr)
    {
        var sb = this.statusbar;
        this.abort.click(function()
        {
            jqxhr.abort();
            sb.hide();
        });
    }
}
function handleFileUpload(files,obj)
{
	commsup = 0;
	websocket.close();	
   for (var i = 0; i < files.length; i++) 
   {
        var fd = new FormData();
        fd.append('file', files[i]);
 
        var status = new createStatusbar(obj); //Using this we can set progress.
        status.setFileNameSize(files[i].name,files[i].size);
        sendFileToServer(fd,status);
 
   }
}

/* MD5 implementation minified from: http://blog.faultylabs.com/files/md5.js
 Javascript MD5 library - version 0.4 Coded (2011) by Luigi Galli - LG@4e71.org - http://faultylabs.com
 Thanks to: Roberto Viola  The below code is PUBLIC DOMAIN - NO WARRANTY!
 */
"undefined"==typeof faultylabs&&(faultylabs={}),faultylabs.MD5=function(n){function r(n){var r=(n>>>0).toString(16);return"00000000".substr(0,8-r.length)+r}function t(n){for(var r=[],t=0;t<n.length;t++)r=r.concat(s(n[t]));return r}function e(n){for(var r=[],t=0;8>t;t++)r.push(255&n),n>>>=8;return r}function o(n,r){return n<<r&4294967295|n>>>32-r}function a(n,r,t){return n&r|~n&t}function f(n,r,t){return t&n|~t&r}function u(n,r,t){return n^r^t}function i(n,r,t){return r^(n|~t)}function c(n,r){return n[r+3]<<24|n[r+2]<<16|n[r+1]<<8|n[r]}function s(n){for(var r=[],t=0;t<n.length;t++)if(n.charCodeAt(t)<=127)r.push(n.charCodeAt(t));else for(var e=encodeURIComponent(n.charAt(t)).substr(1).split("%"),o=0;o<e.length;o++)r.push(parseInt(e[o],16));return r}function l(){for(var n="",t=0,e=0,o=3;o>=0;o--)e=arguments[o],t=255&e,e>>>=8,t<<=8,t|=255&e,e>>>=8,t<<=8,t|=255&e,e>>>=8,t<<=8,t|=e,n+=r(t);return n}function y(n){for(var r=new Array(n.length),t=0;t<n.length;t++)r[t]=n[t];return r}function h(n,r){return 4294967295&n+r}function p(){function n(n,r,t,e){var a=m;m=U,U=d,d=h(d,o(h(b,h(n,h(r,t))),e)),b=a}var r=A.length;A.push(128);var t=A.length%64;if(t>56){for(var s=0;64-t>s;s++)A.push(0);t=A.length%64}for(s=0;56-t>s;s++)A.push(0);A=A.concat(e(8*r));var y=1732584193,p=4023233417,g=2562383102,v=271733878,b=0,d=0,U=0,m=0;for(s=0;s<A.length/64;s++){b=y,d=p,U=g,m=v;var I=64*s;n(a(d,U,m),3614090360,c(A,I),7),n(a(d,U,m),3905402710,c(A,I+4),12),n(a(d,U,m),606105819,c(A,I+8),17),n(a(d,U,m),3250441966,c(A,I+12),22),n(a(d,U,m),4118548399,c(A,I+16),7),n(a(d,U,m),1200080426,c(A,I+20),12),n(a(d,U,m),2821735955,c(A,I+24),17),n(a(d,U,m),4249261313,c(A,I+28),22),n(a(d,U,m),1770035416,c(A,I+32),7),n(a(d,U,m),2336552879,c(A,I+36),12),n(a(d,U,m),4294925233,c(A,I+40),17),n(a(d,U,m),2304563134,c(A,I+44),22),n(a(d,U,m),1804603682,c(A,I+48),7),n(a(d,U,m),4254626195,c(A,I+52),12),n(a(d,U,m),2792965006,c(A,I+56),17),n(a(d,U,m),1236535329,c(A,I+60),22),n(f(d,U,m),4129170786,c(A,I+4),5),n(f(d,U,m),3225465664,c(A,I+24),9),n(f(d,U,m),643717713,c(A,I+44),14),n(f(d,U,m),3921069994,c(A,I),20),n(f(d,U,m),3593408605,c(A,I+20),5),n(f(d,U,m),38016083,c(A,I+40),9),n(f(d,U,m),3634488961,c(A,I+60),14),n(f(d,U,m),3889429448,c(A,I+16),20),n(f(d,U,m),568446438,c(A,I+36),5),n(f(d,U,m),3275163606,c(A,I+56),9),n(f(d,U,m),4107603335,c(A,I+12),14),n(f(d,U,m),1163531501,c(A,I+32),20),n(f(d,U,m),2850285829,c(A,I+52),5),n(f(d,U,m),4243563512,c(A,I+8),9),n(f(d,U,m),1735328473,c(A,I+28),14),n(f(d,U,m),2368359562,c(A,I+48),20),n(u(d,U,m),4294588738,c(A,I+20),4),n(u(d,U,m),2272392833,c(A,I+32),11),n(u(d,U,m),1839030562,c(A,I+44),16),n(u(d,U,m),4259657740,c(A,I+56),23),n(u(d,U,m),2763975236,c(A,I+4),4),n(u(d,U,m),1272893353,c(A,I+16),11),n(u(d,U,m),4139469664,c(A,I+28),16),n(u(d,U,m),3200236656,c(A,I+40),23),n(u(d,U,m),681279174,c(A,I+52),4),n(u(d,U,m),3936430074,c(A,I),11),n(u(d,U,m),3572445317,c(A,I+12),16),n(u(d,U,m),76029189,c(A,I+24),23),n(u(d,U,m),3654602809,c(A,I+36),4),n(u(d,U,m),3873151461,c(A,I+48),11),n(u(d,U,m),530742520,c(A,I+60),16),n(u(d,U,m),3299628645,c(A,I+8),23),n(i(d,U,m),4096336452,c(A,I),6),n(i(d,U,m),1126891415,c(A,I+28),10),n(i(d,U,m),2878612391,c(A,I+56),15),n(i(d,U,m),4237533241,c(A,I+20),21),n(i(d,U,m),1700485571,c(A,I+48),6),n(i(d,U,m),2399980690,c(A,I+12),10),n(i(d,U,m),4293915773,c(A,I+40),15),n(i(d,U,m),2240044497,c(A,I+4),21),n(i(d,U,m),1873313359,c(A,I+32),6),n(i(d,U,m),4264355552,c(A,I+60),10),n(i(d,U,m),2734768916,c(A,I+24),15),n(i(d,U,m),1309151649,c(A,I+52),21),n(i(d,U,m),4149444226,c(A,I+16),6),n(i(d,U,m),3174756917,c(A,I+44),10),n(i(d,U,m),718787259,c(A,I+8),15),n(i(d,U,m),3951481745,c(A,I+36),21),y=h(y,b),p=h(p,d),g=h(g,U),v=h(v,m)}return l(v,g,p,y).toUpperCase()}var A=null,g=null;return"string"==typeof n?A=s(n):n.constructor==Array?0===n.length?A=n:"string"==typeof n[0]?A=t(n):"number"==typeof n[0]?A=n:g=typeof n[0]:"undefined"!=typeof ArrayBuffer?n instanceof ArrayBuffer?A=y(new Uint8Array(n)):n instanceof Uint8Array||n instanceof Int8Array?A=y(n):n instanceof Uint32Array||n instanceof Int32Array||n instanceof Uint16Array||n instanceof Int16Array||n instanceof Float32Array||n instanceof Float64Array?A=y(new Uint8Array(n.buffer)):g=typeof n:g=typeof n,g&&alert("MD5 type mismatch, cannot process "+g),p()};


