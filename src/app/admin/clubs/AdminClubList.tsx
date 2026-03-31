'use client'

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { updateClub, deleteClub } from "./actions";

export default function AdminClubList({ clubs }: { clubs: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Identité / Lieu</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clubs.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-gray-500 font-medium italic">
                  Aucun club enregistré pour le moment.
                </td>
              </tr>
            )}
            
            {clubs.map(club => {
              const editMode = editingId === club.id;
              
              if (editMode) {
                return (
                  <tr key={club.id} className="bg-indigo-50/30">
                    <td colSpan={2} className="p-4 md:p-6">
                      <form action={async (formData) => {
                        await updateClub(formData);
                        setEditingId(null);
                      }} className="flex flex-col gap-4">
                        <input type="hidden" name="id" value={club.id} />
                        
                        <div className="flex flex-wrap gap-4 items-start">
                           <div className="flex-[1.5] w-full min-w-[200px]">
                              <label className="text-xs font-bold text-indigo-500 uppercase block mb-1.5">Nom du Club</label>
                              <input name="name" type="text" defaultValue={club.name} required className="w-full p-3.5 border-2 border-indigo-200 rounded-xl text-base font-bold text-gray-900 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors" />
                           </div>
                           <div className="flex-1 w-full min-w-[150px]">
                              <label className="text-xs font-bold text-indigo-500 uppercase block mb-1.5">Ville (CP)</label>
                              <input name="city" type="text" defaultValue={club.city} required className="w-full p-3.5 border-2 border-indigo-200 rounded-xl text-sm font-medium text-gray-800 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors" />
                           </div>
                           <div className="flex-[2] w-full min-w-[250px]">
                              <label className="text-xs font-bold text-indigo-500 uppercase block mb-1.5">Adresse Complète</label>
                              <input name="address" type="text" defaultValue={club.address} required className="w-full p-3.5 border-2 border-indigo-200 rounded-xl text-sm font-medium text-gray-800 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors" />
                           </div>
                        </div>
                        
                        <div className="flex gap-2 justify-end mt-2">
                          <button type="button" onClick={() => setEditingId(null)} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            Annuler
                          </button>
                          <SubmitButton pendingText="Enregistrement..." className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                            Enregistrer les modifications
                          </SubmitButton>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={club.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl shadow-sm border border-indigo-200 group-hover:scale-105 transition-transform">
                        {club.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-lg text-gray-900 leading-tight">{club.name}</div>
                        <div className="text-sm font-bold text-gray-500 mt-0.5">{club.city}</div>
                        <div className="text-xs text-gray-400 mt-1">{club.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingId(club.id)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                      >
                        ✏️
                      </button>
                      <form action={async (formData) => {
                        const confirm = window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce club ?');
                        if (confirm) {
                          try {
                            await deleteClub(formData);
                          } catch (e: any) {
                            alert(e.message);
                          }
                        }
                      }}>
                        <input type="hidden" name="id" value={club.id} />
                        <SubmitButton pendingText="⏳" className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                          🗑️
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
