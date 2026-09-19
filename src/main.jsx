import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {ArrowRight, LoaderCircle, Mic, MoreHorizontal, Trash2} from 'lucide-react';
import packageInfo from '../package.json';
import './styles.css';

const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const formatTimestamp=value=>new Intl.DateTimeFormat(undefined,{weekday:'short',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));

function Editable({value,onSave,placeholder,emphasis=false,autoFocus=false,clearOnSave=false}){
 const [text,setText]=useState(value||''); const [saving,setSaving]=useState(false); const ref=useRef(null); const savingRef=useRef(false);
 useEffect(()=>setText(value||''),[value]);
 useEffect(()=>{if(ref.current){ref.current.style.height='auto';ref.current.style.height=`${ref.current.scrollHeight}px`}},[text]);
 const save=async()=>{const clean=text.trim();if(savingRef.current||clean===value||!clean)return;savingRef.current=true;setSaving(true);if(clearOnSave)setText('');try{await onSave(clean)}catch{if(clearOnSave)setText(clean)}finally{savingRef.current=false;setSaving(false)}};
 return <div className={'editable '+(emphasis?'emphasis':'')}><textarea ref={ref} autoFocus={autoFocus} rows="1" value={text} placeholder={placeholder} onChange={e=>setText(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.blur()}}}/>{saving&&<LoaderCircle className="spin" size={15}/>}</div>
}

function App(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[newItem,setNewItem]=useState(''),[adding,setAdding]=useState(false),[listening,setListening]=useState(false),[error,setError]=useState('');
 const [touchDragging,setTouchDragging]=useState(null); const draggingId=useRef(null); const savingOrder=useRef(false); const itemsRef=useRef([]); const touchTimer=useRef(null); const touchStart=useRef(null);
 const recognitionRef=useRef(null); const voiceLimitTimer=useRef(null); const silenceTimer=useRef(null); const tapTimer=useRef(null); const lastTap=useRef(0);
 useEffect(()=>{itemsRef.current=items},[items]);
 const load=async()=>{if(draggingId.current||savingOrder.current)return;const {data,error}=await supabase.from('kanban_items').select('*, kanban_notes(*)').order('position').order('position',{referencedTable:'kanban_notes'});if(error)setError(error.message);else setItems(data||[]);setLoading(false)};
 useEffect(()=>{load();const channel=supabase.channel('board').on('postgres_changes',{event:'*',schema:'public',table:'kanban_items'},load).on('postgres_changes',{event:'*',schema:'public',table:'kanban_notes'},load).subscribe();return()=>supabase.removeChannel(channel)},[]);
 useEffect(()=>()=>{clearTimeout(tapTimer.current);clearTimeout(voiceLimitTimer.current);clearTimeout(silenceTimer.current);recognitionRef.current?.abort()},[]);
 const addItem=async e=>{e.preventDefault();stopVoice();const title=newItem.trim();if(!title)return;setAdding(true);const {error}=await supabase.from('kanban_items').insert({title,position:items.length});if(error)setError(error.message);else{setNewItem('');await load()}setAdding(false)};
 const updateItem=async(id,title)=>{await supabase.from('kanban_items').update({title}).eq('id',id);await load()};
 const updateNote=async(id,content)=>{await supabase.from('kanban_notes').update({content}).eq('id',id);await load()};
 const addNote=async(itemId,position,content)=>{const {error}=await supabase.from('kanban_notes').insert({item_id:itemId,content,position});if(error){setError(error.message);throw error}await load()};
 const remove=async id=>{await supabase.from('kanban_items').delete().eq('id',id);await load()};
 const removeNote=async id=>{const {error}=await supabase.from('kanban_notes').delete().eq('id',id);if(error)setError(error.message);else await load()};
 const moveRow=overId=>{const from=itemsRef.current.findIndex(item=>item.id===draggingId.current);const to=itemsRef.current.findIndex(item=>item.id===overId);if(from<0||to<0||from===to)return;const reordered=[...itemsRef.current];const [moved]=reordered.splice(from,1);reordered.splice(to,0,moved);itemsRef.current=reordered;setItems(reordered)};
 const finishRowDrag=async()=>{if(!draggingId.current)return;const reordered=itemsRef.current;savingOrder.current=true;draggingId.current=null;const results=await Promise.all(reordered.map((item,position)=>supabase.from('kanban_items').update({position}).eq('id',item.id)));const failed=results.find(result=>result.error);if(failed)setError(failed.error.message);savingOrder.current=false;await load()};
 const startTouchDrag=(itemId,event)=>{if(event.target.closest('button,input'))return;const touch=event.touches[0];touchStart.current={x:touch.clientX,y:touch.clientY};clearTimeout(touchTimer.current);touchTimer.current=setTimeout(()=>{draggingId.current=itemId;setTouchDragging(itemId);navigator.vibrate?.(30)},300)};
 const moveTouchDrag=event=>{const touch=event.touches[0];if(!draggingId.current){if(touchStart.current&&Math.hypot(touch.clientX-touchStart.current.x,touch.clientY-touchStart.current.y)>10)clearTimeout(touchTimer.current);return}event.preventDefault();const row=document.elementFromPoint(touch.clientX,touch.clientY)?.closest('[data-row-id]');if(row)moveRow(row.dataset.rowId)};
 const endTouchDrag=async()=>{clearTimeout(touchTimer.current);touchStart.current=null;if(!draggingId.current)return;setTouchDragging(null);await finishRowDrag()};
 const stopVoice=()=>{clearTimeout(voiceLimitTimer.current);clearTimeout(silenceTimer.current);recognitionRef.current?.stop()};
 const resetSilenceTimer=()=>{clearTimeout(silenceTimer.current);silenceTimer.current=setTimeout(stopVoice,3000)};
 const startVoice=()=>{const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition){setError('Voice dictation is not supported by this browser.');return}if(recognitionRef.current||listening)return;const recognition=new SpeechRecognition();const startingText=newItem.trim();recognitionRef.current=recognition;recognition.continuous=true;recognition.interimResults=true;recognition.lang=navigator.language||'en-US';recognition.onstart=()=>{setListening(true);resetSilenceTimer();voiceLimitTimer.current=setTimeout(stopVoice,10000)};recognition.onresult=event=>{let finalText='',interimText='';for(let i=0;i<event.results.length;i++){const words=event.results[i][0].transcript.trim();if(event.results[i].isFinal)finalText+=`${words} `;else interimText+=words}setNewItem([startingText,finalText.trim(),interimText.trim()].filter(Boolean).join(' '));resetSilenceTimer()};recognition.onerror=event=>{if(!['aborted','no-speech'].includes(event.error))setError(`Voice dictation: ${event.error}`)};recognition.onend=()=>{clearTimeout(voiceLimitTimer.current);clearTimeout(silenceTimer.current);recognitionRef.current=null;setListening(false)};try{recognition.start()}catch{recognitionRef.current=null;setListening(false)}};
 const handleVoiceTap=()=>{const now=Date.now();if(now-lastTap.current<350){clearTimeout(tapTimer.current);lastTap.current=0;if(recognitionRef.current)stopVoice();return}lastTap.current=now;clearTimeout(tapTimer.current);tapTimer.current=setTimeout(()=>{lastTap.current=0;startVoice()},350)};
 const maxNotes=Math.max(1,...items.map(i=>i.kanban_notes.length+1));
 return <main>
  <form className={`new-item sticky-new-item ${listening?'listening':''}`} onSubmit={addItem}><input disabled={adding} value={newItem} onChange={e=>setNewItem(e.target.value)} onPointerUp={handleVoiceTap} placeholder={listening?'Listening… speak now':adding?'Adding…':'Tap to dictate or type a new item…'}/><Mic className="voice-icon" size={20}/></form>
  <section className="board-shell">
   {loading?<div className="loading"><LoaderCircle className="spin"/>Loading your board…</div>:<>
    <div className="board" style={{'--cols':maxNotes+1}}>
     {items.map(item=><div className={`row ${touchDragging===item.id?'dragging touch-dragging':''}`} data-row-id={item.id} key={item.id} draggable onDragStart={event=>{draggingId.current=item.id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',item.id);event.currentTarget.classList.add('dragging')}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='move';moveRow(item.id)}} onDrop={event=>{event.preventDefault();finishRowDrag()}} onDragEnd={event=>{event.currentTarget.classList.remove('dragging');finishRowDrag()}} onTouchStart={event=>startTouchDrag(item.id,event)} onTouchMove={moveTouchDrag} onTouchEnd={endTouchDrag} onTouchCancel={endTouchDrag}>
      <div className="cell item-cell"><div className="item-number">{formatTimestamp(item.created_at)}</div><Editable emphasis value={item.title} onSave={v=>updateItem(item.id,v)}/><button className="delete" onClick={()=>remove(item.id)} title="Delete item"><Trash2 size={15}/></button></div>
      {item.kanban_notes.map(note=><React.Fragment key={note.id}><div className="connector"><ArrowRight size={15}/></div><div className="cell note-cell"><div className="note-meta">{formatTimestamp(note.created_at)}</div><Editable value={note.content} onSave={v=>updateNote(note.id,v)}/><button className="delete" onClick={()=>removeNote(note.id)} title="Delete note" aria-label="Delete note"><Trash2 size={15}/></button></div></React.Fragment>)}
      <React.Fragment key={`add-${item.id}-${item.kanban_notes.length}`}><div className="connector"><ArrowRight size={15}/></div><div className="cell add-note"><Editable clearOnSave placeholder="Add next update…" value="" onSave={v=>addNote(item.id,item.kanban_notes.length,v)}/></div></React.Fragment>
     </div>)}
    </div>
    {items.length===0&&<div className="empty"><MoreHorizontal/><h2>Your board is ready.</h2><p>Add the first item below, then follow its story across the row.</p></div>}
   </>}
  </section>
  {error&&<div className="error" onClick={()=>setError('')}>{error}</div>}
  <footer><span>{items.length} {items.length===1?'item':'items'} · v{packageInfo.version}</span><span>Click any entry to edit · Enter to save</span></footer>
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
