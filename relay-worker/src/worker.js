/* Cloudflare Worker / Durable Object WebSocket relay; HTTP 443-friendly fallback */
export default {
 async fetch(req,env){
  const url=new URL(req.url);
  if(url.pathname==='/health')return new Response('CHAOS RELIC relay ready');
  const match=url.pathname.match(/^\/room\/([A-HJ-NP-Z2-9]{7})$/);
  if(!match)return new Response('Not Found',{status:404});
  if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket upgrade required',{status:426});
  if(env.ALLOWED_ORIGIN&&req.headers.get('Origin')!==env.ALLOWED_ORIGIN)return new Response('Origin denied',{status:403});
  const role=url.searchParams.get('role'),id=url.searchParams.get('id');
  if(!['host','guest'].includes(role)||!/^[a-z0-9-]{8,80}$/i.test(id||''))return new Response('Bad request',{status:400});
  return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(req);
 }
};
export class RoomRelay{
 constructor(state,env){this.ctx=state;this.env=env;}
 sessions(){return this.ctx.getWebSockets().map(ws=>({ws,meta:ws.deserializeAttachment()})).filter(x=>x.meta);}
 host(){return this.sessions().find(s=>s.meta.role==='host');}
 send(ws,msg){try{ws.send(JSON.stringify(msg))}catch{}}
 async fetch(req){
  const url=new URL(req.url),role=url.searchParams.get('role'),id=url.searchParams.get('id');
  const peers=this.sessions();
  if(role==='host'&&peers.some(x=>x.meta.role==='host'))return new Response('Room already exists',{status:409});
  if(role==='guest'&&!this.host())return new Response('Host offline',{status:404});
  if(peers.some(x=>x.meta.id===id))return new Response('Duplicate ID',{status:409});
  if(peers.length>=9)return new Response('Room full',{status:429});
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];
  this.ctx.acceptWebSocket(server);server.serializeAttachment({role,id});
  this.send(server,{type:'ready',id,role});
  return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(ws,message){
  if(typeof message!=='string'||message.length>65000){ws.close(1009,'Message too large');return;}
  let msg;try{msg=JSON.parse(message)}catch{return}if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
  const caller=ws.deserializeAttachment();if(!caller)return;
  if(caller.role==='host'){
    if(msg.type==='state'&&typeof msg.to==='string'){
      const peer=this.sessions().find(s=>s.meta.role==='guest'&&s.meta.id===msg.to);
      if(peer)this.send(peer.ws,{type:'state',state:msg.state});
    }else if(msg.type==='closed'){this.sessions().filter(s=>s.meta.role==='guest').forEach(s=>this.send(s.ws,{type:'closed'}));}
  }else{
    const host=this.host();if(!host)return;
    if(msg.type==='hello'&&typeof msg.name==='string')this.send(host.ws,{type:'hello',from:caller.id,name:msg.name.slice(0,14)});
    else if(msg.type==='action'&&msg.action&&typeof msg.action==='object')this.send(host.ws,{type:'action',from:caller.id,action:msg.action});
  }
 }
 webSocketClose(ws){
  const caller=ws.deserializeAttachment();if(!caller)return;
  if(caller.role==='host'){
    for(const x of this.sessions()){if(x.meta.role==='guest'){this.send(x.ws,{type:'closed'});try{x.ws.close(1000,'Host left')}catch{}}}
  }else{const host=this.host();if(host)this.send(host.ws,{type:'guest_left',from:caller.id});}
 }
 webSocketError(ws){this.webSocketClose(ws);}
}
