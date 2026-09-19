import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {ArrowRight, LoaderCircle, MoreHorizontal, Trash2} from 'lucide-react';
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
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[newItem,setNewItem]=useState(''),[adding,setAdding]=useState(false),[error,setError]=useState('');
 const load=async()=>{const {data,error}=await supabase.from('kanban_items').select('*, kanban_notes(*)').order('position').order('position',{referencedTable:'kanban_notes'});if(error)setError(error.message);else setItems(data||[]);setLoading(false)};
 useEffect(()=>{load();const channel=supabase.channel('board').on('postgres_changes',{event:'*',schema:'public',table:'kanban_items'},load).on('postgres_changes',{event:'*',schema:'public',table:'kanban_notes'},load).subscribe();return()=>supabase.removeChannel(channel)},[]);
 const addItem=async e=>{e.preventDefault();const title=newItem.trim();if(!title)return;setAdding(true);const {error}=await supabase.from('kanban_items').insert({title,position:items.length});if(error)setError(error.message);else{setNewItem('');await load()}setAdding(false)};
 const updateItem=async(id,title)=>{await supabase.from('kanban_items').update({title}).eq('id',id);await load()};
 const updateNote=async(id,content)=>{await supabase.from('kanban_notes').update({content}).eq('id',id);await load()};
 const addNote=async(itemId,position,content)=>{const {error}=await supabase.from('kanban_notes').insert({item_id:itemId,content,position});if(error){setError(error.message);throw error}await load()};
 const remove=async id=>{await supabase.from('kanban_items').delete().eq('id',id);await load()};
 const removeNote=async id=>{const {error}=await supabase.from('kanban_notes').delete().eq('id',id);if(error)setError(error.message);else await load()};
 const maxNotes=Math.max(1,...items.map(i=>i.kanban_notes.length+1));
 return <main>
  <section className="board-shell">
   {loading?<div className="loading"><LoaderCircle className="spin"/>Loading your board…</div>:<>
    <div className="board" style={{'--cols':maxNotes+1}}>
     {items.map(item=><div className="row" key={item.id}>
      <div className="cell item-cell"><div className="item-number">{formatTimestamp(item.created_at)}</div><Editable emphasis value={item.title} onSave={v=>updateItem(item.id,v)}/><button className="delete" onClick={()=>remove(item.id)} title="Delete item"><Trash2 size={15}/></button></div>
      {item.kanban_notes.map(note=><React.Fragment key={note.id}><div className="connector"><ArrowRight size={15}/></div><div className="cell note-cell"><div className="note-meta">{formatTimestamp(note.created_at)}</div><Editable value={note.content} onSave={v=>updateNote(note.id,v)}/><button className="delete" onClick={()=>removeNote(note.id)} title="Delete note" aria-label="Delete note"><Trash2 size={15}/></button></div></React.Fragment>)}
      <React.Fragment key={`add-${item.id}-${item.kanban_notes.length}`}><div className="connector"><ArrowRight size={15}/></div><div className="cell add-note"><Editable clearOnSave placeholder="Add next update…" value="" onSave={v=>addNote(item.id,item.kanban_notes.length,v)}/></div></React.Fragment>
     </div>)}
    </div>
    {items.length===0&&<div className="empty"><MoreHorizontal/><h2>Your board is ready.</h2><p>Add the first item below, then follow its story across the row.</p></div>}
   </>}
  </section>
  <form className="new-item" onSubmit={addItem}><input disabled={adding} value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder={adding?'Adding…':'Type a new item and press Enter…'}/></form>
  {error&&<div className="error" onClick={()=>setError('')}>{error}</div>}
  <footer><span>{items.length} {items.length===1?'item':'items'} · v{packageInfo.version}</span><span>Click any entry to edit · Enter to save</span></footer>
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
