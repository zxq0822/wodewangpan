import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;
function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
    return supabaseInstance;
}

export class R2Adapter {
    constructor() {
        this.bucket = process.env.SUPABASE_BUCKET || 'qing-files';
    }
    get supabase() { return getSupabase(); }

    async get(key) {
        const { data, error } = await this.supabase.storage.from(this.bucket).download(key);
        if (error || !data) return null;
        return {
            body: data, // Edge runtime Response can take Blob directly
            httpMetadata: { contentType: data.type }
        };
    }
    
    async head(key) {
        const pathParts = key.split('/');
        const name = pathParts.pop();
        const prefix = pathParts.join('/');
        const { data, error } = await this.supabase.storage.from(this.bucket).list(prefix, { search: name });
        if (error || !data || data.length === 0) return null;
        return data.find(o => o.name === name) || null;
    }
    
    async put(key, body, options) {
        let uploadBody = body;
        if (body instanceof ReadableStream) {
            uploadBody = await new Response(body).arrayBuffer();
        }
        const contentType = options?.httpMetadata?.contentType || 'application/octet-stream';
        await this.supabase.storage.from(this.bucket).upload(key, uploadBody, { upsert: true, contentType });
    }
    
    async delete(keyOrKeys) {
        const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
        await this.supabase.storage.from(this.bucket).remove(keys);
    }
    
    async list({ prefix, delimiter, cursor }) {
        const cleanPrefix = prefix?.endsWith('/') ? prefix.slice(0, -1) : (prefix || '');
        const { data, error } = await this.supabase.storage.from(this.bucket).list(cleanPrefix, { limit: 1000 });
        if (error || !data) return { objects: [], delimitedPrefixes: [] };
        
        const objects = [];
        const delimitedPrefixes = [];
        
        for (const item of data) {
            if (item.name === '.emptyFolderPlaceholder') continue;
            if (!item.id) {
                // Supabase folder placeholder
                delimitedPrefixes.push(prefix ? prefix + item.name + '/' : item.name + '/');
            } else {
                const fullKey = prefix ? prefix + item.name : item.name;
                objects.push({ key: fullKey, size: item.metadata?.size || 0, uploaded: item.updated_at });
            }
        }
        return { objects, delimitedPrefixes, truncated: false };
    }
}

export class KVAdapter {
    get supabase() { return getSupabase(); }

    async get(key, type) {
        const { data, error } = await this.supabase.from('kv_store').select('value').eq('id', key).single();
        if (error || !data) return null;
        if (type === 'json') {
            try { return JSON.parse(data.value); } catch(e) { return null; }
        }
        return data.value;
    }
    
    async put(key, value) {
        const strVal = typeof value === 'string' ? value : JSON.stringify(value);
        await this.supabase.from('kv_store').upsert({ id: key, value: strVal });
    }
    
    async delete(key) {
        await this.supabase.from('kv_store').delete().eq('id', key);
    }
    
    async list({ prefix, cursor }) {
        let query = this.supabase.from('kv_store').select('id');
        if (prefix) {
            query = query.like('id', `${prefix}%`);
        }
        const { data, error } = await query;
        if (error || !data) return { keys: [], list_complete: true };
        return { keys: data.map(d => ({ name: d.id })), list_complete: true };
    }
}
