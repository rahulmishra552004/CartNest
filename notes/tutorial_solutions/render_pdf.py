"""Render accurate solution text as a compact, unruled handwritten-style scan."""
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
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
WORK = Path('/tmp/tutorial_solutions_work')
WORK.mkdir(exist_ok=True)
FONT_PATH = '/mnt/c/Windows/Fonts/Inkfree.ttf'
W, H = 1654, 2339
LEFT, RIGHT = 112, 1540
BOTTOM = 2206
INK = (35, 48, 76)
HEIGHTS = {
    'ENCAPSULATION': 148, 'LAYER_MAPPING': 252, 'FILE_PATH': 104,
    'HANDSHAKE': 285, 'UDP_HEADER': 100, 'CWND_SKETCH': 133,
    'ARQ_EXAMPLE': 143, 'FDM_TDM': 156, 'WAVEFORMS': 410,
    'CRC_DIVISION': 218, 'GBN_COUNT': 157, 'SUBNET_TABLE': 237,
}


@lru_cache(maxsize=64)
def font(size):
    return ImageFont.truetype(FONT_PATH, size)


@lru_cache(maxsize=40000)
def glyph(char, size, variant):
    """Make restrained variants of the same hand, rather than mixing writers."""
    r = random.Random(ord(char) * 701 + size * 47 + variant * 1223)
    f = font(size)
    box = f.getbbox(char, anchor='ls')
    pad = 7
    im = Image.new('L', (box[2] - box[0] + 2*pad, box[3] - box[1] + 2*pad), 0)
    ImageDraw.Draw(im).text((pad-box[0], pad-box[1]), char, font=f, fill=255, anchor='ls')
    xs, ys = r.uniform(.955, 1.045), r.uniform(.96, 1.05)
    im = im.resize((max(1, round(im.width*xs)), max(1, round(im.height*ys))), Image.Resampling.BICUBIC)
    im = im.rotate(r.uniform(-1.4, 1.4), Image.Resampling.BICUBIC, expand=False)
    return im, (box[0]-pad)*xs, (box[1]-pad)*ys, f.getlength(char)*xs


class Hand:
    def __init__(self, seed):
        self.r = random.Random(seed)
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.im)
        self.extents = []

    def text(self, text, x, y, size=35, fixed=None, faint=False):
        """y is a baseline; letter size, pressure and baseline vary slightly."""
        start = x
        slope = self.r.uniform(-.0017, .0017)
        phase = self.r.uniform(0, math.tau)
        wordsize = size
        for char in text:
            if char == ' ':
                x += fixed or font(wordsize).getlength(' ')*self.r.uniform(.88, 1.17)
                wordsize = size + self.r.choices([-1, 0, 1], [1, 6, 1])[0]
                continue
            mask, bx, by, advance = glyph(char, wordsize, self.r.randrange(14))
            yy = y + (x-start)*slope + math.sin((x-start)/155 + phase)*1.05 + self.r.uniform(-.45, .45)
            xx = round(x+bx)
            ytop = round(yy+by)
            alpha = self.r.randint(200, 241) if faint else self.r.randint(225, 255)
            layer = Image.new('RGBA', mask.size, (*INK, alpha))
            layer.putalpha(mask.point(lambda p: p*alpha//255))
            self.im.alpha_composite(layer, (xx, ytop))
            x += fixed or advance
        self.extents.append((start, y-size, x, y+size*.23, text))
        return x

    def line(self, points, width=2, alpha=240):
        pp=[]
        for i,(x,y) in enumerate(points):
            if i:
                lx,ly=points[i-1]
                for t in (.25,.5,.75):
                    pp.append((lx+(x-lx)*t+self.r.uniform(-.65,.65),ly+(y-ly)*t+self.r.uniform(-.65,.65)))
            pp.append((x+self.r.uniform(-.7,.7),y+self.r.uniform(-.7,.7)))
        self.draw.line(pp, fill=(*INK, alpha), width=width, joint='curve')

    def arrow(self,x1,y1,x2,y2):
        self.line([(x1,y1),(x2,y2)])
        theta=math.atan2(y2-y1,x2-x1)
        self.line([(x2-12*math.cos(theta-.5),y2-12*math.sin(theta-.5)),(x2,y2),(x2-12*math.cos(theta+.5),y2-12*math.sin(theta+.5))])

    def box(self,x,y,w,h):
        self.line([(x,y),(x+w,y),(x+w,y+h),(x,y+h),(x,y)])

    def diagram(self,name,y):
        T=self.text
        if name=='ENCAPSULATION':
            rows=['Application data','[ TCP header | application data ]','[ IP header | TCP header | application data ]','[ MAC header | IP | TCP | data | FCS ]   ->   bits on the link']
            for j,t in enumerate(rows): T(t,155+j*12,y+28+j*33,31)
        elif name=='LAYER_MAPPING':
            T('OSI (7 layers)',200,y+23,33);T('TCP/IP (4 layers)',865,y+23,33)
            rows=[('7  Application','Application'),('6  Presentation',''),('5  Session',''),('4  Transport','Transport: TCP, UDP'),('3  Network','Internet: IP'),('2  Data link','Link: Ethernet, Wi-Fi'),('1  Physical','')]
            for j,(a,b) in enumerate(rows):
                yy=y+55+j*28
                T(a,200,yy,29)
                if b:T(b,865,yy,29)
            self.line([(710,y+36),(737,y+36),(737,y+110),(710,y+110)])
            self.arrow(739,y+74,835,y+74)
            self.arrow(710,y+137,835,y+137);self.arrow(710,y+165,835,y+165)
            self.line([(710,y+176),(737,y+176),(737,y+222),(710,y+222)])
            self.arrow(739,y+199,835,y+199)
        elif name=='FILE_PATH':
            labels=['A','Switch','Router','Switch','B']; xs=[170,430,690,950,1210]
            for x,label in zip(xs,labels):
                self.box(x,y+15,160,49);T(label,x+20,y+50,31)
            for x in xs[:-1]: self.arrow(x+166,y+39,x+254,y+39)
            T('LAN 1',398,y+96,27);T('LAN 2',1015,y+96,27)
        elif name=='HANDSHAKE':
            xa,xb=290,1350
            T('Client A',xa-70,y+25,33);T('Server B',xb-80,y+25,33)
            self.line([(xa,y+40),(xa,y+267)]);self.line([(xb,y+40),(xb,y+267)])
            msgs=[('SYN, seq = 1000',78,True),('SYN + ACK, seq = 5000, ack = 1001',152,False),('ACK, seq = 1001, ack = 5001',226,True)]
            for msg,dy,right in msgs:
                T(msg,430,y+dy-12,29)
                self.arrow(xa if right else xb,y+dy,xb if right else xa,y+dy+13)
        elif name=='UDP_HEADER':
            xx=145; wid=325
            labels=['Source port','Destination port','Length','Checksum']
            for j,label in enumerate(labels):
                x=xx+j*wid;self.box(x,y+14,wid,58);T(label,x+15,y+52,29)
                T('16 bits',x+100,y+93,26)
        elif name=='CWND_SKETCH':
            self.arrow(190,y+112,1340,y+112);self.arrow(190,y+112,190,y+12)
            T('cwnd',120,y+18,26);T('RTT',1360,y+120,26)
            pts=[(230,y+106),(340,y+99),(450,y+84),(560,y+55),(670,y+34),(790,y+28),(910,y+22),(1030,y+16)]
            self.line(pts)
            T('1, 2, 4, 8 ...',310,y+44,26);T('then about +1 MSS / RTT',830,y+77,27)
        elif name=='ARQ_EXAMPLE':
            rows=[('Original sends:','1     2 (lost)     3     4'),('GBN repeats:','      2            3     4'),('SR repeats:','      2 only')]
            for j,(a,b) in enumerate(rows):T(a,150,y+32+j*43,31);T(b,600,y+32+j*43,31)
        elif name=='FDM_TDM':
            T('FDM',130,y+43,30)
            for j,c in enumerate('ABCD'):
                x=330+j*250;self.box(x,y+8,192,47);T(c,x+80,y+42,30)
                if j<3:T('g',x+207,y+42,27)
            T('frequency',1330,y+44,26)
            T('TDM',130,y+119,30)
            for j,c in enumerate('ABCDABCD'):
                x=330+j*124;self.box(x,y+84,124,48);T(c,x+49,y+119,30)
            T('time',1350,y+119,27)
        elif name=='WAVEFORMS':
            x0=330;dx=166
            for j,b in enumerate('1011001'):T(b,x0+(j+.5)*dx-9,y+27,31)
            waves=[('NRZ-L',[1,0,1,1,0,0,1],dx,1),('NRZI',[1,1,0,1,1,1,0],dx,0),('Manchester',[0,1,1,0,0,1,0,1,1,0,1,0,0,1],dx/2,None)]
            for k,(label,levels,width,initial) in enumerate(waves):
                top=y+56+k*115;lo=top+57
                T(label,125,top+34,29);T('H',282,top+7,25);T('L',282,lo+7,25)
                pts=[]
                if k==1:pts=[(x0-22,lo),(x0,lo)]
                for j,val in enumerate(levels):
                    yy=top if val else lo
                    pts.extend([(x0+j*width,yy),(x0+(j+1)*width,yy)])
                self.line(pts,width=2)
                for j in range(8):self.line([(x0+j*dx,lo+12),(x0+j*dx,lo+18)],width=1,alpha=145)
            T('Each pair of small ticks encloses one bit interval.',335,y+405,26)
        elif name=='CRC_DIVISION':
            xs=[144,616,1075]
            for x,t in zip(xs,['Working value','XOR aligned divisor','Result']):T(t,x,y+27,28)
            rows=[('11010110110000','10011000000000','01001110110000'),('01001110110000','01001100000000','00000010110000'),('00000010110000','00000010011000','00000000101000'),('00000000101000','00000000100110','00000000001110')]
            for j,row in enumerate(rows):
                for x,t in zip(xs,row):T(t,x,y+67+j*37,28,fixed=27)
            T('The final four bits are 1110.',740,y+214,28)
        elif name=='GBN_COUNT':
            rows=[('Original P1-P8','8 sends'),('Repeat P4-P8','5 sends'),('Original P9-P15','7 sends'),('Repeat P12-P15','4 sends')]
            for j,(a,b) in enumerate(rows):T(a,250,y+28+j*36,31);T(b,960,y+28+j*36,31)
            self.line([(1420,y+9),(1440,y+9),(1440,y+147),(1420,y+147)])
        elif name=='SUBNET_TABLE':
            xs=[150,425,740,1240]
            for x,t in zip(xs,['Subnet','Network','Usable host range','Broadcast']):T(t,x,y+28,29)
            self.line([(145,y+40),(1500,y+40)],width=1)
            rows=[('1 (/26)','.0','.1 - .62','.63'),('2 (/26)','.64','.65 - .126','.127'),('3 (/26)','.128','.129 - .190','.191'),('4 (/26)','.192','.193 - .254','.255')]
            for j,row in enumerate(rows):
                for x,t in zip(xs,row):T(t,x,y+79+j*39,31)
            T('All addresses begin with 192.168.10',340,y+235,29)
        else:
            raise ValueError(name)


def wrap(text,size,width):
    f=font(size);words=text.split();lines=[];current=''
    for word in words:
        new=(current+' '+word).strip()
        if current and f.getlength(new)>width:
            lines.append(current);current=word
        else:current=new
    if current:lines.append(current)
    return lines


def plan(lines,body):
    y=112;out=[]
    for line in lines:
        if not line.strip():continue
        if line.startswith('@'):
            name=line[1:];out.append(('diagram',name,LEFT,y,body));y+=HEIGHTS[name]+12;continue
        if line.startswith('### '):
            text=line[4:];size=body+1;gap=7;leading=body*1.17;kind='sub'
        elif line.startswith('## '):
            text=line[3:];size=body+5;gap=12;leading=size*1.17;kind='question'
        elif line.startswith('# '):
            text=line[2:];size=body+4;gap=15;leading=size*1.22;kind='title'
        else:
            text=line.strip();size=body;gap=6;leading=body*1.15;kind='body'
        ind=30 if line.startswith('    ') else 0
        width=RIGHT-LEFT-ind-44
        y+=gap
        for j,s in enumerate(wrap(text,size,width)):
            y+=leading
            out.append((kind,s,LEFT+ind,y,size))
        y+=2
    return out,y


def scanned(hand,seed):
    rng=np.random.default_rng(seed)
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    # A quiet scanner bed: nearly white paper, soft edge shading, fine grain.
    shade=1.5*(xx/W)+.8*(yy/H)+1.3*np.sin(xx/W*2.1+seed)*np.sin(yy/H*1.4)
    edge=6*np.exp(-xx/23)+3.5*np.exp(-(W-xx)/20)+3*np.exp(-yy/21)+3*np.exp(-(H-yy)/24)
    base=252-shade-edge+rng.normal(0,.68,(H,W))
    arr=np.empty((H,W,3),dtype=np.uint8)
    for c,delta in enumerate([0,-.45,-1.8]):arr[:,:,c]=np.clip(base+delta,0,255).astype(np.uint8)
    paper=Image.fromarray(arr)
    # A slight page skew and tiny loss of sharpness imitate scanned ink.
    angle=random.Random(seed).uniform(-.18,.18)
    ink=hand.im.rotate(angle,Image.Resampling.BICUBIC,expand=False)
    paper.paste(ink,(0,0),ink)
    return paper.filter(ImageFilter.GaussianBlur(.18))


def main():
    args=argparse.ArgumentParser();args.add_argument('--pages',default='all');opt=args.parse_args()
    pages=ROOT.joinpath('solutions.txt').read_text().split('@@PAGE ')[1:]
    wanted=set(range(1,16)) if opt.pages=='all' else {int(x) for x in opt.pages.split(',')}
    doc=pymupdf.open();report=[];thumbs=[]
    for chunk in pages:
        lines=chunk.splitlines();num=int(lines[0].split('|')[0]);label=lines[0].split('|')[1].strip()
        if num not in wanted:continue
        for size in range(30,25,-1):
            layout,end=plan(lines[1:],size)
            if end<=BOTTOM:break
        if end>BOTTOM:raise RuntimeError(f'Page {num} overflow: {end}')
        hand=Hand(9387+num*73)
        for kind,text,x,y,z in layout:
            if kind=='diagram':hand.diagram(text,y)
            else:
                shift=hand.r.uniform(-4.8,4.8)
                last=hand.text(text,x+shift,y+hand.r.uniform(-1.1,1.1),z)
                if kind in ('title','question'):
                    hand.line([(x+shift,y+9),(min(last,x+1280),y+hand.r.uniform(8,11))],width=1 if kind=='title' else 2)
        hand.text(f'{num}',1440,2286,29)
        final=scanned(hand,4123+num*357)
        final.save(WORK/f'page_{num:02d}.jpg',quality=92,subsampling=0,dpi=(200,200))
        thumb=final.copy();thumb.thumbnail((330,467));thumbs.append((num,thumb))
        page=doc.new_page(width=595.276,height=841.89)
        page.insert_image(page.rect,filename=str(WORK/f'page_{num:02d}.jpg'))
        # Searchable text is invisible, like the OCR layer of a scanned PDF.
        plain='\n'.join(s.lstrip('# ') for s in lines[1:] if s and not s.startswith('@'))
        page.insert_textbox(pymupdf.Rect(25,25,570,810),plain,fontsize=5.3,fontname='helv',render_mode=3,overlay=True)
        overs=[(round(x2,1),t) for x1,y1,x2,y2,t in hand.extents if x2>W-65 or y2>H-30 or x1<50 or y1<40]
        report.append({'page':num,'label':label,'font_px':size,'content_bottom':round(end,1),'overspill':overs})
        print(json.dumps(report[-1]),flush=True)
    if opt.pages=='all':
        toc=[(1,'Tutorial sheet 1',1),(2,'Q1 - OSI communication',1),(2,'Q2 - OSI and TCP/IP',2),(2,'Q3 - Troubleshooting',3),(2,'Q4 and Q5 - File transfer and layering',4),(2,'Q6 - TCP mechanisms',5),(2,'Q7 - TCP handshake',6),(2,'Q8 - TCP versus UDP',7),(2,'Q9 - Congestion control',8),(2,'Q10 - GBN and SR',9),(1,'Tutorial sheet 2',10),(2,'Q1 and Q2 - Fiber and multiplexing',10),(2,'Q3 - Line encoding',11),(2,'Q4 and Q5 - Medium access',12),(2,'Q6 and Q7 - CRC and utilization',13),(2,'Q8 - Retransmission counts',14),(2,'Q9 and Q10 - IPv4 subnetting',15)]
        doc.set_toc(toc)
    doc.set_metadata({'title':'Computer Networks - Tutorial Sheets 1 and 2 - Worked Solutions','author':'','subject':'15 pages of digitally rendered handwriting-style worked solutions','creator':'Tutorial solution renderer','keywords':'Computer Networks, OSI, TCP, CRC, ARQ, subnetting'})
    output=ROOT/('computer_networks_15_page_handwritten_solutions.pdf' if opt.pages=='all' else 'preview.pdf')
    doc.save(output,garbage=4,deflate=True)
    contact=Image.new('RGB',(330*3,467*math.ceil(len(thumbs)/3)),(225,225,223))
    for idx,(num,thumb) in enumerate(thumbs):contact.paste(thumb,((idx%3)*330,(idx//3)*467))
    contact.save(WORK/'contact_sheet.jpg',quality=88)
    (WORK/'layout_report.json').write_text(json.dumps(report,indent=2))
    print(f'SAVED {output} ({output.stat().st_size/1024/1024:.1f} MiB)',flush=True)


if __name__=='__main__':main()
