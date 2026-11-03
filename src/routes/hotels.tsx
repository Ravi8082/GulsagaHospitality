import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Layout } from '@/components/hotel-layout';
import { HotelCard } from '@/components/hotel-card';
import { hotels, pageHead } from '@/lib/hotel-data';
export const Route=createFileRoute('/hotels')({head:()=>pageHead('Our stays','Explore Gulsaga’s collection of resorts, heritage hotels and mountain retreats across India.'),component:Hotels});
function Hotels(){const [search,setSearch]=useState('');const filtered=hotels.filter(h=>(h.name+' '+h.location+' '+h.theme).toLowerCase().includes(search.toLowerCase()));return <Layout><section className="page-intro"><p className="eyebrow">THE GULSAGA COLLECTION</p><h1>Find your happy place.</h1><p>Beautiful stays, from the mountains to the backwaters.</p></section><section className="content-section"><div className="collection-toolbar"><span>{filtered.length} handpicked stays</span><label className="search-field"><Search size={18}/><input aria-label="Search hotels" placeholder="Search a hotel or destination" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="stay-grid">{filtered.map(h=><HotelCard key={h.id} hotel={h}/>)}</div>{filtered.length===0&&<p className="empty-state">No stays found for “{search}”.</p>}</section></Layout>}
