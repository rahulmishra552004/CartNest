"""Render a less dense, ruled revision with varied ballpoint handwriting."""
from __future__ import annotations

import argparse
import json
import math
import random
from functools import lru_cache
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageFilter

import render_pdf as base

ROOT = Path(__file__).resolve().parent
WORK = Path('/tmp/tutorial_solutions_ruled')
WORK.mkdir(exist_ok=True)
W, H = base.W, base.H
LEFT, RIGHT = 150, 1548
RULE_FIRST, PITCH = 170, 49
BASELINE = RULE_FIRST - 6
LAST_BASELINE = 2180
base.INK = (22, 43, 103)


@lru_cache(maxsize=40000)
def natural_glyph(char, size, variant, slant):
    """Vary stroke shape and width, not just the placement of identical glyphs."""
    seed = ord(char)*9181 + variant*1777 + size*383 + (slant+5)*101
    r = random.Random(seed)
    f = base.font(size*2)
    box = f.getbbox(char, anchor='ls')
    pad = 18
    im = Image.new('L',(box[2]-box[0]+2*pad,box[3]-box[1]+2*pad),0)
    ImageDraw.Draw(im).text((pad-box[0],pad-box[1]),char,font=f,fill=255,anchor='ls')
    # A continuous mesh bends stems and loops, giving repeated letters different forms.
    nx, ny = 3, 4
    xs=[round(i*im.width/nx) for i in range(nx+1)]
    ys=[round(i*im.height/ny) for i in range(ny+1)]
    nodes={}
    for j,y in enumerate(ys):
        for i,x in enumerate(xs):
            inside=0<i<nx and 0<j<ny
            nodes[i,j]=(x+r.uniform(-2.0,2.0) if inside else x,
                        y+r.uniform(-1.8,1.8) if inside else y)
    mesh=[]
    for j in range(ny):
        for i in range(nx):
            quad=nodes[i,j]+nodes[i,j+1]+nodes[i+1,j+1]+nodes[i+1,j]
            mesh.append(((xs[i],ys[j],xs[i+1],ys[j+1]),quad))
    im=im.transform(im.size,Image.Transform.MESH,mesh,Image.Resampling.BICUBIC)
    shear=slant*.025+r.uniform(-.018,.018)
    im=im.transform(im.size,Image.Transform.AFFINE,(1,shear,-shear*(pad-box[1]),0,1,0),Image.Resampling.BICUBIC)
    im=im.rotate(r.uniform(-1.9,1.9),Image.Resampling.BICUBIC)
    # Slightly thicker/darker stretches imitate pressure changes along pen strokes.
    im=Image.blend(im,im.filter(ImageFilter.MaxFilter(3)),r.uniform(.09,.27))
    mask=np.asarray(im).astype(np.float32)
    yy,xx=np.mgrid[:im.height,:im.width]
    pressure=.94+.055*np.sin(yy/r.uniform(9,18)+xx/r.uniform(15,30)+r.uniform(0,6.3))
    mask=np.clip(mask*pressure,0,255).astype(np.uint8)
    im=Image.fromarray(mask)
    xscale,yscale=r.uniform(.944,1.058),r.uniform(.943,1.063)
    im=im.resize((max(1,round(im.width*xscale/2)),max(1,round(im.height*yscale/2))),Image.Resampling.LANCZOS)
    return im,(box[0]-pad)*xscale/2,(box[1]-pad)*yscale/2,f.getlength(char)*xscale/2


class NaturalHand(base.Hand):
    def text(self,text,x,y,size=34,fixed=None,faint=False):
        start=x
        slope=self.r.uniform(-.0022,.0022)
        phase=self.r.uniform(0,math.tau)
        wordsize=size
        slant=self.r.randint(-2,3)
        word_y=self.r.uniform(-1.0,1.0)
        word_pressure=self.r.randint(229,253)
        for c in text:
            if c==' ':
                x+=fixed or base.font(wordsize).getlength(' ')*self.r.uniform(.82,1.36)
                wordsize=size+self.r.choices([-1,0,1],[2,7,2])[0]
                slant=self.r.randint(-2,3)
                word_y=self.r.uniform(-1.3,1.3)
                word_pressure=self.r.randint(229,253)
                continue
            mask,bx,by,advance=natural_glyph(c,wordsize,self.r.randrange(20),slant)
            yy=y+(x-start)*slope+1.45*math.sin((x-start)/180+phase)+word_y+self.r.uniform(-.55,.55)
            alpha=word_pressure+self.r.randint(-5,2)
            if faint:alpha-=25
            color=tuple(max(0,v+self.r.randint(-2,2)) for v in base.INK)
            layer=Image.new('RGBA',mask.size,(*color,255))
            layer.putalpha(mask.point(lambda p:p*alpha//255))
            self.im.alpha_composite(layer,(round(x+bx),round(yy+by)))
            x+=fixed or advance+self.r.uniform(-.25,.3)
        self.extents.append((start,y-size-5,x,y+size*.27,text))
        return x


def plan(lines,size):
    cursor=0
    out=[]
    seen_question=False
    for line in lines:
        if not line.strip():continue
        if line.startswith('# '):
            out.append(('title',line[2:],LEFT,112,size+4))
            continue
        if line.startswith('@'):
            name=line[1:]
            top=BASELINE+cursor*PITCH-24
            out.append(('diagram',name,LEFT,top,size))
            cursor+=math.ceil((base.HEIGHTS[name]+20)/PITCH)
            continue
        if line.startswith('## '):
            if seen_question:cursor+=1
            seen_question=True
            text=line[3:];kind='question';z=size+3
        elif line.startswith('### '):
            text=line[4:];kind='sub';z=size+1
        else:
            text=line.strip();kind='body';z=size
        ind=24 if line.startswith('    ') else 0
        # Extra width reserve accommodates real glyph and spacing variation.
        for textline in base.wrap(text,z,RIGHT-LEFT-ind-54):
            out.append((kind,textline,LEFT+ind,BASELINE+cursor*PITCH,z))
            cursor+=1
    last=BASELINE+(cursor-1)*PITCH
    return out,last,cursor


def paper_scan(hand,num):
    seed=10991+num*419
    rng=np.random.default_rng(seed)
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    shade=1.2*xx/W+.8*yy/H+1.0*np.sin(xx/W*2.2+num)*np.sin(yy/H*2.1)
    edge=7*np.exp(-xx/20)+3*np.exp(-(W-xx)/17)+3*np.exp(-yy/18)+4*np.exp(-(H-yy)/21)
    white=252.4-shade-edge+rng.normal(0,.72,(H,W))
    arr=np.empty((H,W,3),dtype=np.uint8)
    for c,delta in enumerate([0,-.25,-1.4]):arr[:,:,c]=np.clip(white+delta,0,255).astype(np.uint8)
    paper=Image.fromarray(arr)
    printing=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(printing)
    for y in range(RULE_FIRST,2240,PITCH):
        d.line([(56,y),(1598,y)],fill=(147,174,204,125),width=1)
        d.line([(56,y+1),(1598,y+1)],fill=(147,174,204,38),width=1)
    d.line([(111,84),(111,2260)],fill=(204,126,136,112),width=2)
    # Ink and ruling share the same scan skew so the writing stays on the page.
    printing.alpha_composite(hand.im)
    angle=random.Random(seed).uniform(-.17,.17)
    printing=printing.rotate(angle,Image.Resampling.BICUBIC,expand=False)
    paper.paste(printing,(0,0),printing)
    return paper.filter(ImageFilter.GaussianBlur(.15))


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--pages',default='all')
    ap.add_argument('--layout-only',action='store_true')
    args=ap.parse_args()
    wanted=set(range(1,16)) if args.pages=='all' else {int(x) for x in args.pages.split(',')}
    chunks=(ROOT/'solutions_ruled.txt').read_text().split('@@PAGE ')[1:]
    doc=pymupdf.open();report=[];thumbs=[];toc=[]
    for chunk in chunks:
        lines=chunk.splitlines();num=int(lines[0].split('|')[0]);label=lines[0].split('|')[1].strip()
        if num not in wanted:continue
        for size in [34,33,32]:
            layout,end,rows=plan(lines[1:],size)
            if end<=LAST_BASELINE:break
        info={'page':num,'font_px':size,'bottom':end,'ruled_rows_used':rows,'words':len(chunk.split())}
        if args.layout_only:
            print(json.dumps(info),flush=True)
            continue
        if end>LAST_BASELINE:raise RuntimeError(f'Overflow: {info}')
        hand=NaturalHand(7023+num*89)
        for kind,text,x,y,z in layout:
            if kind=='diagram':hand.diagram(text,y)
            else:
                shift=hand.r.uniform(-4,5)
                last=hand.text(text,x+shift,y+hand.r.uniform(-1.2,1.2),z)
                if kind in ['title','question']:
                    hand.line([(x+shift,y+7),(min(last,x+1280),y+hand.r.uniform(6,9))],width=1)
        hand.text(str(num),1460,2290,30)
        im=paper_scan(hand,num)
        path=WORK/f'page_{num:02d}.jpg';im.save(path,quality=92,subsampling=0,dpi=(200,200))
        thumb=im.copy();thumb.thumbnail((330,467));thumbs.append(thumb)
        page=doc.new_page(width=595.276,height=841.89)
        page.insert_image(page.rect,filename=str(path))
        plain='\n'.join(s.lstrip('# ') for s in lines[1:] if s and not s.startswith('@'))
        remain=page.insert_textbox(pymupdf.Rect(24,25,571,810),plain,fontsize=6,fontname='helv',render_mode=3)
        if remain<0:raise RuntimeError(f'Text layer overflow on page {num}')
        toc.append([1,label,len(doc)])
        info['overspill']=[(round(x2,1),t) for x1,y1,x2,y2,t in hand.extents if x2>W-55 or x1<55 or y2>H-25 or y1<45]
        if info['overspill']:raise RuntimeError(f'Bounds issue: {info}')
        report.append(info);print(json.dumps(info),flush=True)
    if args.layout_only:return
    doc.set_toc(toc)
    doc.set_metadata({'title':'Computer Networks - 15-page ruled handwritten solutions','subject':'Digitally rendered handwriting, ruled paper, concise worked solutions','creator':'Tutorial solution renderer','keywords':'Computer Networks, ruled, OSI, TCP, CRC, subnetting'})
    name='computer_networks_15_page_ruled_solutions.pdf' if args.pages=='all' else 'ruled_preview.pdf'
    path=ROOT/name;doc.save(path,garbage=4,deflate=True)
    contact=Image.new('RGB',(990,467*math.ceil(len(thumbs)/3)),(225,225,223))
    for i,thumb in enumerate(thumbs):contact.paste(thumb,((i%3)*330,(i//3)*467))
    contact.save(WORK/'contact_sheet.jpg',quality=88)
    (WORK/'layout_report.json').write_text(json.dumps(report,indent=2))
    print(f'SAVED {path} ({path.stat().st_size/1024/1024:.1f} MiB)',flush=True)


if __name__=='__main__':main()
