"""Lay out verified solutions as monochrome notebook scans matching the reference.

The generated paper is embedded unchanged in the PDF. Handwriting is a separate
transparent typography layer; no source/reference photograph is edited here.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import random
import re
from functools import lru_cache
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import render_pdf as old

ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'reference_assets'
WORK=Path('/tmp/tutorial_solutions_reference')
WORK.mkdir(exist_ok=True)
W,H=1654,2339
FONT=ASSETS/'Kalam-Regular.ttf'
PAPER=ASSETS/'blank_notebook_scan.png'
INK=(29,28,26)
old.INK=INK
SIZE=44
LEFT,RIGHT=250,1560
# Measured horizontal rulings in the generated 1087 x 1446 notebook scan.
RULES=[84,122,160,197,236,274,312,350,388,425,463,501,539,577,616,654,694,
       734,773,812,851,890,930,969,1009,1049,1090,1133,1175,1217,1259,1300,1341,1383]
BASELINES=[round(y*H/1446)-9 for y in RULES]
TITLES={
 (1,1):'OSI model: data communication', (1,2):'OSI and TCP/IP models',
 (1,3):'Troubleshooting with OSI', (1,4):'File transfer across networks',
 (1,5):'Layered architecture', (1,6):'TCP: main mechanisms',
 (1,7):'TCP three-way handshake', (1,8):'TCP and UDP',
 (1,9):'TCP congestion control', (1,10):'Go-Back-N and Selective Repeat',
 (2,1):'Link between factory buildings', (2,2):'Multiplexing four channels',
 (2,3):'NRZ, NRZI and Manchester', (2,4):'Pure and Slotted ALOHA',
 (2,5):'Ethernet and Wi-Fi access', (2,6):'CRC calculation',
 (2,7):'Stop-and-Wait utilization', (2,8):'GBN and SR: packet-loss example',
 (2,9):'Four subnets from a /24', (2,10):'Subnet for 50 usable hosts',
}


@lru_cache(maxsize=80)
def font(z):return ImageFont.truetype(str(FONT),z)


@lru_cache(maxsize=45000)
def letter(c,z,variant,slant):
    r=random.Random(ord(c)*3907+z*193+variant*2039+(slant+4)*23)
    f=font(z*2); b=f.getbbox(c,anchor='ls');pad=24
    im=Image.new('L',(b[2]-b[0]+pad*2,b[3]-b[1]+pad*2),0)
    ImageDraw.Draw(im).text((pad-b[0],pad-b[1]),c,font=f,fill=255,anchor='ls')
    # De-slant the handwritten font to match the upright reference lettering.
    shear=.18+slant*.014+r.uniform(-.009,.009)
    im=im.transform(im.size,Image.Transform.AFFINE,
                    (1,-shear,shear*(pad-b[1]),0,1,0),Image.Resampling.BICUBIC)
    nx,ny=3,4
    xs=[round(k*im.width/nx) for k in range(nx+1)]
    ys=[round(k*im.height/ny) for k in range(ny+1)]
    nodes={}
    for j,y in enumerate(ys):
        for i,x in enumerate(xs):
            inside=0<i<nx and 0<j<ny
            nodes[i,j]=(x+r.uniform(-1.7,1.7) if inside else x,
                        y+r.uniform(-1.6,1.6) if inside else y)
    mesh=[]
    for j in range(ny):
        for i in range(nx):
            quad=nodes[i,j]+nodes[i,j+1]+nodes[i+1,j+1]+nodes[i+1,j]
            mesh.append(((xs[i],ys[j],xs[i+1],ys[j+1]),quad))
    im=im.transform(im.size,Image.Transform.MESH,mesh,Image.Resampling.BICUBIC)
    im=im.rotate(r.uniform(-1.7,1.7),Image.Resampling.BICUBIC)
    im=Image.blend(im,im.filter(ImageFilter.MinFilter(3)),r.uniform(.45,.72))
    mask=np.asarray(im).astype(np.float32)
    yy,xx=np.mgrid[:im.height,:im.width]
    pressure=.965+.032*np.sin(xx/r.uniform(10,25)+yy/r.uniform(8,19)+r.uniform(0,6.3))
    im=Image.fromarray(np.clip(mask*pressure,0,255).astype(np.uint8))
    sx,sy=r.uniform(.946,1.058),r.uniform(.945,1.055)
    im=im.resize((max(1,round(im.width*sx/2)),max(1,round(im.height*sy/2))),Image.Resampling.LANCZOS)
    return im,(b[0]-pad)*sx/2,(b[1]-pad)*sy/2,f.getlength(c)*sx/2


class Hand(old.Hand):
    def __init__(self,seed):
        super().__init__(seed)
        self.figure_origin=None

    def coords(self,x,y):
        if self.figure_origin is None:return x,y
        return x*.94+75,self.figure_origin+(y-self.figure_origin)*1.22

    def text(self,s,x,y,size=SIZE,fixed=None,faint=False):
        x,y=self.coords(x,y)
        if self.figure_origin is not None:size=round(size*1.22)
        return self.rawtext(s,x,y,size,fixed,faint)

    def rawtext(self,s,x,y,size=SIZE,fixed=None,faint=False):
        start=x;phase=self.r.uniform(0,6.3);slope=self.r.uniform(-.002,.002)
        z=size;slant=self.r.randint(-2,2);word_y=self.r.uniform(-1.3,1.3)
        alpha=self.r.randint(231,252)
        chars=[];last=0
        for match in re.finditer(r'\^\(([^)]*)\)|\^([A-Za-z0-9]+)',s):
            chars.extend((c,False) for c in s[last:match.start()])
            chars.extend((c,True) for c in (match.group(1) or match.group(2)))
            last=match.end()
        chars.extend((c,False) for c in s[last:])
        for c,exp in chars:
            if c==' ':
                x+=fixed or font(round(z*.73) if exp else z).getlength(' ')*self.r.uniform(1.02,1.4)
                z=size+self.r.choices([-1,0,1],[2,7,2])[0]
                slant=self.r.randint(-2,2);word_y=self.r.uniform(-1.5,1.5)
                alpha=self.r.randint(231,252)
                continue
            zz=round(z*.73) if exp else z
            mask,bx,by,advance=letter(c,zz,self.r.randrange(18),slant)
            yy=y+(x-start)*slope+1.35*math.sin((x-start)/165+phase)+word_y+self.r.uniform(-.45,.45)
            if exp:yy-=size*.30
            a=alpha-(23 if faint else 0)+self.r.randint(-3,2)
            layer=Image.new('RGBA',mask.size,(*INK,255))
            layer.putalpha(mask.point(lambda p:p*a//255))
            self.im.alpha_composite(layer,(round(x+bx),round(yy+by)))
            x+=fixed or advance+self.r.uniform(.20,.65)
        self.extents.append((start,y-size-4,x,y+size*.25,s))
        return x

    def line(self,points,width=2,alpha=242):
        transformed=[self.coords(x,y) for x,y in points]
        super().line(transformed,width,alpha)

    def figure(self,name,top):
        self.figure_origin=top
        super().diagram(name,top)
        self.figure_origin=None

    def bullet(self,x,y,arrow=False):
        if arrow:
            self.arrow(x-4,y-11,x+25,y-11)
        else:
            self.draw.ellipse((x-3,y-16,x+4,y-9),fill=(*INK,240))


def width(s,size=SIZE):
    return font(size).getlength(s)+len(s)*.45+s.count(' ')*3


def wrap(s,size=SIZE,limit=RIGHT-LEFT-25):
    out=[];line=''
    for word in s.split():
        trial=(line+' '+word).strip()
        if line and width(trial,size)>limit:out.append(line);line=word
        else:line=trial
    if line:out.append(line)
    return out


def split_paragraph(s):
    if len(s.split())<=43:return [s]
    parts=re.split(r'(?<=[.!?])\s+(?=[A-Z])',s)
    out=[];part=''
    for sentence in parts:
        trial=(part+' '+sentence).strip()
        if part and len(trial.split())>38:out.append(part);part=sentence
        else:part=trial
    if part:out.append(part)
    return out


def read_blocks():
    blocks=[];sheet=1;q=0
    for s in (ROOT/'solutions_ruled.txt').read_text().splitlines():
        if s.startswith('@@PAGE '):sheet=int(re.search(r'Sheet (\d)',s).group(1));continue
        if s.startswith('## '):
            q=int(re.match(r'## Q(\d+)\.',s).group(1))
            blocks.append({'kind':'question','key':(sheet,q),'text':TITLES[sheet,q]});continue
        if not s or s.startswith('# '):continue
        if s.startswith('### '):blocks.append({'kind':'sub','text':s[4:]});continue
        if s.startswith('@'):blocks.append({'kind':'figure','text':s[1:]});continue
        if s.startswith('    '):
            if blocks[-1]['kind']=='formula':blocks[-1]['lines'].append(s.strip())
            else:blocks.append({'kind':'formula','lines':[s.strip()]})
            continue
        if s.startswith('OSI advantages:'):
            blocks.append({'kind':'comparison','text':'Model comparison','cols':[
                ('OSI',['Clear division of functions','Modular design; fault isolation','Limits: abstract; some overlap']),
                ('TCP/IP',['Practical interoperability','Open standards; scalable routing','Limits: broader layer boundaries'])]})
            continue
        if s.startswith('TCP/IP advantages:'):continue
        for part in split_paragraph(s):blocks.append({'kind':'body','text':part})
    return blocks


class Notebook:
    def __init__(self):
        self.pages=[];self.page=None;self.row=0;self.key=None;self.toc=[]

    def fresh(self,continued=True):
        self.page={'items':[],'text':[],'key':self.key}
        self.pages.append(self.page);self.row=0
        if continued and self.key:
            s,q=self.key
            title=f'{s}.{q}  {TITLES[self.key]} (cont.)'
            for line in wrap(title,42,RIGHT-200):
                self.add('heading',line,200,42)
            self.page['text'].append(f'Tutorial sheet {s} Q{q} continued')

    def remain(self):return len(BASELINES)-self.row

    def add(self,kind,text,x=LEFT,size=SIZE,**extra):
        if self.remain()<1:self.fresh()
        self.page['items'].append({'kind':kind,'text':text,'x':x,'y':BASELINES[self.row],'size':size,**extra})
        self.row+=1

    def ensure(self,n):
        if self.page is None:self.fresh(False)
        elif self.remain()<n:self.fresh()

    def build(self,blocks):
        for i,b in enumerate(blocks):
            kind=b['kind']
            if kind=='question':
                key=tuple(b['key'])
                # Start a question on a new sheet if less than a third remains.
                if self.page is None or self.remain()<12:
                    self.key=key;self.fresh(False)
                else:
                    self.row+=1;self.key=key
                self.page['key']=self.page['key'] or key
                self.toc.append([1,f'Tutorial {key[0]} - Q{key[1]}: {b["text"]}',len(self.pages)])
                title=f'{key[0]}.{key[1]}  {b["text"]}'
                for line in wrap(title,46,RIGHT-200):self.add('heading',line,200,46)
                self.page['text'].append(f'Tutorial sheet {key[0]} Q{key[1]}. {b["text"]}')
            elif kind=='sub':
                lines=wrap(b['text'],43,RIGHT-205)
                nxt=blocks[i+1] if i+1<len(blocks) else {'kind':'body'}
                if nxt['kind']=='comparison':keep=7
                elif nxt['kind']=='figure':keep=math.ceil((old.HEIGHTS[nxt['text']]*1.22+30)/62)
                elif nxt['kind']=='formula':keep=min(6,len(nxt['lines'])+1)
                else:keep=3
                self.ensure(len(lines)+keep)
                for line in lines:self.add('sub',line,205,43)
                self.page['text'].append(b['text'])
            elif kind=='figure':
                name=b['text'];height=old.HEIGHTS[name]*1.22+30
                rows=math.ceil(height/62)
                self.ensure(rows)
                top=BASELINES[self.row]-36
                self.page['items'].append({'kind':'figure','text':name,'y':top})
                self.row+=rows
            elif kind=='comparison':
                self.ensure(7)
                self.page['items'].append({'kind':'comparison','text':b['text'],'cols':b['cols'],'y':BASELINES[self.row]-34})
                self.row+=7
                self.page['text'].append('OSI: clear responsibilities, modular design and troubleshooting; abstract boundaries can overlap. TCP/IP: practical interoperability, open standards and scalable routing; broader layer boundaries.')
            elif kind=='formula':
                lines=[]
                for line in b['lines']:lines+=wrap(line,42,RIGHT-260-35)
                boxed=any(k in ' '.join(lines) for k in ['CRC remainder','Codeword =','GBN total','SR total','Required prefix','U = Tt'])
                need=len(lines)+(1 if boxed else 0)
                self.ensure(need)
                if boxed:
                    top=BASELINES[self.row]-42;last=BASELINES[self.row+len(lines)-1]+19
                    self.page['items'].append({'kind':'outline','x':230,'y':top,'w':min(1305,max(width(t,42) for t in lines)+65),'h':last-top})
                for line in lines:self.add('formula',line,260,42)
                if boxed:self.row+=1
                self.page['text'].extend(b['lines'])
            else:
                text=b['text'];lines=wrap(text)
                if len(lines)<=5:self.ensure(len(lines))
                for j,line in enumerate(lines):
                    if self.remain()<1:self.fresh()
                    self.add('body',line,LEFT,SIZE,bullet=j==0)
                self.page['text'].append(text)
        return self


def draw_comparison(hand,item):
    y=item['y'];w=635;hh=352
    for i,(title,lines) in enumerate(item['cols']):
        x=205+i*690
        hand.box(x,y,w,hh)
        end=hand.text(title,x+24,y+47,45)
        hand.line([(x+24,y+56),(end,y+56)],width=2)
        row=0
        for s in lines:
            wrapped=wrap(s,37,w-78)
            for j,line in enumerate(wrapped):
                yy=y+107+row*47
                if j==0:hand.bullet(x+26,yy)
                hand.text(line,x+51,yy,37)
                row+=1


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--preview',action='store_true');ap.add_argument('--layout-only',action='store_true');args=ap.parse_args()
    book=Notebook().build(read_blocks())
    print('PAGES',len(book.pages),flush=True)
    if args.layout_only:
        for i,p in enumerate(book.pages):
            print(i+1,len(p['items']),len(' '.join(p['text']).split()),p['text'][0] if p['text'] else '')
        return
    doc=pymupdf.open();report=[];background_xref=0
    chosen=book.pages[:3] if args.preview else book.pages
    for i,p in enumerate(chosen):
        hand=Hand(30307+i*193)
        for item in p['items']:
            kind=item['kind']
            if kind=='figure':hand.figure(item['text'],item['y']);continue
            if kind=='comparison':draw_comparison(hand,item);continue
            if kind=='outline':hand.box(item['x'],item['y'],item['w'],item['h']);continue
            x=item['x']+hand.r.uniform(-3,4);y=item['y']+hand.r.uniform(-1.1,1.1)
            end=hand.text(item['text'],x,y,item['size'])
            if kind in ['heading','sub']:
                hand.line([(x,y+8),(end,y+hand.r.uniform(7,10))],width=2)
            if kind=='body' and item.get('bullet'):hand.bullet(205,y)
        hand.text(str(i+1),1510,2295,31)
        ink=hand.im.filter(ImageFilter.GaussianBlur(.12))
        buf=io.BytesIO();ink.save(buf,format='PNG')
        page=doc.new_page(width=595.276,height=841.89)
        if background_xref:
            page.insert_image(page.rect,xref=background_xref,keep_proportion=False)
        else:
            background_xref=page.insert_image(page.rect,filename=str(PAPER),keep_proportion=False)
        page.insert_image(page.rect,stream=buf.getvalue(),keep_proportion=False)
        txt='\n'.join(p['text'])
        ret=page.insert_textbox(pymupdf.Rect(25,25,570,810),txt,fontname='helv',fontsize=6,render_mode=3)
        if ret<0:raise RuntimeError(f'OCR overflow page {i+1}')
        overs=[(round(x2),s) for x1,y1,x2,y2,s in hand.extents if x2>W-30 or y2>H-20 or x1<150 or y1<45]
        if overs:print('BOUNDS',i+1,overs,flush=True)
        info={'page':i+1,'words':len(txt.split()),'overspill':overs,'last_baseline':max(t.get('y',0) for t in p['items'])}
        report.append(info);print(json.dumps(info),flush=True)
    doc.set_toc([t for t in book.toc if t[2]<=len(doc)])
    doc.set_metadata({'title':'Computer Networks - Handwritten notebook solutions','subject':'Monochrome ruled notebook style based on the supplied reference; digitally rendered writing','creator':'Reference notebook solution renderer'})
    name='reference_preview.pdf' if args.preview else 'computer_networks_reference_style_solutions.pdf'
    out=ROOT/name;doc.save(out,garbage=4,deflate=True)
    for i,page in enumerate(doc):
        if args.preview or i in [0,len(doc)//2,len(doc)-1]:
            page.get_pixmap(matrix=pymupdf.Matrix(1.65,1.65)).save(WORK/f'page_{i+1:02d}.png')
    (WORK/'layout_report.json').write_text(json.dumps(report,indent=2))
    print('SAVED',out,'pages',len(doc),'MiB',round(out.stat().st_size/1024/1024,1),flush=True)


if __name__=='__main__':main()
