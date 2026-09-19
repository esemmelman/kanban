import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {ArrowRight, Check, LoaderCircle, MoreHorizontal, Trash2} from 'lucide-react';
import './styles.css';

const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function Editable({value,onSave,placeholder,emphasis=false,autoFocus=false}){
 const [text,setText]=useState(value||''); const [saving,setSaving]=useState(false); const ref=useRef(null);
 useEffect(()=>setText(value||''),[value]);
 const save=async()=>{const clean=text.trim(); if(clean===value||!clean)return; setSaving(true); await onSave(clean); setSaving(false)};
 return <div className={'editable '+(emphasis?'emphasis':'')}><textarea ref={ref} autoFocus={autoFocus} rows="1" value={text} placeholder={placeholder} onChange={e=>setText(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.blur()}}}/>{saving&&<LoaderCircle className="spin" size={15}/>}</div>
}

function App(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[newItem,setNewItem]=useState(''),[adding,setAdding]=useState(false),[error,setError]=useState('');
 const load=async()=>{const {data,error}=await supabase.from('kanban_items').select('*, kanban_notes(*)').order('position').order('position',{referencedTable:'kanban_notes'});if(error)setError(error.message);else setItems(data||[]);setLoading(false)};
 useEffect(()=>{load();const channel=supabase.channel('board').on('postgres_changes',{event:'*',schema:'public',table:'kanban_items'},load).on('postgres_changes',{event:'*',schema:'public',table:'kanban_notes'},load).subscribe();return()=>supabase.removeChannel(channel)},[]);
 const addItem=async e=>{e.preventDefault();const title=newItem.trim();if(!title)return;setAdding(true);const {error}=await supabase.from('kanban_items').insert({title,position:items.length});if(error)setError(error.message);else{setNewItem('');await load()}setAdding(false)};
 const updateItem=async(id,title)=>{await supabase.from('kanban_items').update({title}).eq('id',id);await load()};
 const updateNote=async(id,content)=>{await supabase.from('kanban_notes').update({content}).eq('id',id);await load()};
 const addNote=async(item,content)=>{const {error}=await supabase.from('kanban_notes').insert({item_id:item.id,content,position:item.kanban_notes.length});if(error)setError(error.message);else await load()};
 const remove=async id=>{await supabase.from('kanban_items').delete().eq('id',id);await load()};
 const maxNotes=Math.max(1,...items.map(i=>i.kanban_notes.length+1));
 return <main>
  <header><div className="mark"><Check size={18}/></div><div><h1>Threadboard</h1><p>One thing at a time, one update at a time.</p></div><div className="status"><span></span>Synced</div></header>
  <section className="board-shell">
   {loading?<div className="loading"><LoaderCircle className="spin"/>Loading your board…</div>:<>
    <div className="board" style={{'--cols':maxNotes+1}}>
     {items.map(item=><div className="row" key={item.id}>
      <div className="cell item-cell"><div className="item-number">{String(items.indexOf(item)+1).padStart(2,'0')}</div><Editable emphasis value={item.title} onSave={v=>updateItem(item.id,v)}/><button className="delete" onClick={()=>remove(item.id)} title="Delete item"><Trash2 size={15}/></button></div>
      {item.kanban_notes.map((note,index)=><React.Fragment key={note.id}><div className="connector"><ArrowRight size={15}/></div><div className="cell note-cell"><div className="note-meta">UPDATE {String(index+1).padStart(2,'0')}</div><Editable value={note.content} onSave={v=>updateNote(note.id,v)}/></div></React.Fragment>)}
      <div className="connector"><ArrowRight size={15}/></div><div className="cell add-note"><Editable placeholder="Add next update…" value="" onSave={v=>addNote(item,v)}/></div>
     </div>)}
    </div>
    {items.length===0&&<div className="empty"><MoreHorizontal/><h2>Your board is ready.</h2><p>Add the first item below, then follow its story across the row.</p></div>}
   </>}
  </section>
  <form className="new-item" onSubmit={addItem}><input disabled={adding} value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder={adding?'Adding…':'Type a new item and press Enter…'}/></form>
  {error&&<div className="error" onClick={()=>setError('')}>{error}</div>}
  <footer><span>{items.length} {items.length===1?'item':'items'}</span><span>Click any entry to edit · Enter to save</span></footer>
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
