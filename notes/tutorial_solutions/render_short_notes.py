"""Create ten pages of concise, typeset tutorial notes (two questions per page)."""
from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'computer_networks_short_notes.pdf'
Q = []
def add(title, *blocks):
    Q.append((title, blocks))

add('Data communication using the OSI model',
    '<b>Seven layers:</b> Application provides services such as HTTP; Presentation handles encoding, compression and encryption; Session manages dialogues; Transport provides process delivery; Network handles routing; Data Link handles local frames; Physical transmits signals.',
    '<b>Encapsulation:</b> At the sender, each lower layer adds control information. Application data becomes a TCP segment, then an IP packet, then an Ethernet frame, and finally transmitted bits. Ethernet also adds a trailer.',
    '<b>Example:</b> A browser sends an HTTP request. TCP adds ports and sequence numbers, IP adds source/destination IP addresses, and Ethernet adds local MAC addresses. For a remote server, the first destination MAC is the gateway\'s.',
    '<b>Decapsulation:</b> The receiver checks and removes frame information, processes IP, and passes the payload to TCP. TCP reorders and acknowledges bytes, then delivers them to the browser/server application. Routers replace link frames at each hop.')

add('OSI and TCP/IP models',
    '<b>Layer mapping:</b> OSI Application + Presentation + Session → TCP/IP Application; Transport → Transport; Network → Internet; Data Link + Physical → Link. This uses the four-layer TCP/IP convention.',
    '<b>Similarities:</b> Both divide networking into layers, use encapsulation, separate application/transport/routing functions, and support different physical networks.',
    '<b>Differences:</b> OSI is a seven-layer reference framework with explicit service, interface and protocol boundaries. TCP/IP is a practical Internet protocol suite with broader layer boundaries and best-effort, connectionless IP.',
    '<b>OSI:</b> Clear responsibilities help teaching, design and troubleshooting. Its strict boundaries do not always match real implementations.',
    '<b>TCP/IP:</b> Open standards, interoperability and scalable routing support real networks. Session/presentation functions are less explicitly separated. Examples: HTTP/DNS, TCP/UDP, IP, Ethernet/Wi-Fi. Neither model alone guarantees security or reliability.')

add('Troubleshooting using the seven OSI layers',
    'Identify affected users/services and recent changes. For general connectivity failure, work upward and test one cause at a time.',
    '<b>1. Physical:</b> Check power, cables, ports and wireless signal. Example: replace a damaged cable when the link light is off.',
    '<b>2. Data Link:</b> Check VLANs, MAC/ARP tables and frame errors. Example: a wrong VLAN prevents reaching the gateway.',
    '<b>3. Network:</b> Check IP address, mask, gateway and routes. Example: local access works but remote access fails because the gateway is wrong.',
    '<b>4. Transport:</b> Check listeners, TCP/UDP ports and firewalls. Example: ping works but blocked port 443 prevents HTTPS.',
    '<b>5. Session:</b> Check session state and expiry; expired tokens can cause repeated logouts. <b>6. Presentation:</b> Check encoding and TLS compatibility; a wrong clock can cause certificate errors.',
    '<b>7. Application:</b> Check DNS, credentials, permissions and logs. Example: DNS failure prevents hostname access. Retest the original task after fixing the fault.')

add('Sending a file to a different network',
    '<b>1.</b> The application reads the file, manages the dialogue and applies encoding/encryption as needed. DNS resolves the destination name.',
    '<b>2.</b> TCP establishes a connection and divides the byte stream into segments. Ports identify applications; sequence numbers, ACKs and retries provide reliable, ordered transfer.',
    '<b>3.</b> IP adds the endpoint addresses. The sender identifies the remote subnet and selects its default gateway.',
    '<b>4.</b> ARP obtains the gateway\'s MAC address. Ethernet encapsulates the IP packet; the physical layer sends signals. A switch forwards the frame using its MAC table.',
    '<b>5.</b> Each router removes the incoming frame, selects an IP route, decrements TTL and creates a new outgoing frame. The final router addresses its frame to the receiver.',
    '<b>6.</b> The receiver decapsulates the frame and packet. TCP checks and orders the bytes, and the application reconstructs the file. ACKs travel back. MAC addresses change per link; endpoint IPs normally remain the same without NAT.')

add('Why networking uses layers',
    'A layer groups related functions, uses the service below it and serves the layer above. A <b>protocol</b> governs peer communication; an <b>interface</b> governs interaction between adjacent layers.',
    '<b>Reduced complexity:</b> Signaling, addressing, routing and reliable delivery can be studied and designed separately.',
    '<b>Interoperability:</b> Standard protocols allow devices and software from different vendors to communicate.',
    '<b>Independent changes and reuse:</b> Applications can use Ethernet or Wi-Fi through the same IP/transport services. Many applications reuse TCP rather than implementing reliability themselves.',
    '<b>Easier troubleshooting:</b> Tests can isolate a cable fault, routing error or application problem. Clear responsibilities also simplify testing and maintenance.',
    '<b>Limitations:</b> Extra headers and processing cause overhead; functions can be duplicated across layers. Strict separation may hide information that could improve performance.')

add('TCP mechanisms',
    '<b>Service:</b> TCP is connection-oriented and full-duplex. It provides a reliable, ordered byte stream, but does not preserve application message boundaries.',
    '<b>Establishment:</b> SYN → SYN + ACK → ACK synchronizes sequence numbers and negotiates options.',
    '<b>Reliability:</b> Byte sequence numbers, checksums, cumulative ACKs, adaptive retransmission timers and duplicate suppression recover missing/corrupt data. SACK can identify received blocks beyond a gap. Example: 500 bytes starting at 1001 are acknowledged by ACK 1501.',
    '<b>Flow control:</b> The receiver advertises rwnd to avoid buffer overflow. <b>Congestion control:</b> The sender adjusts cwnd to limit network load. Outstanding data is limited by min(rwnd, cwnd).',
    '<b>Termination:</b> Normally FIN → ACK → FIN → ACK closes the two directions independently. FIN consumes one sequence number; ACK and FIN can be combined. The active closer normally enters TIME-WAIT. RST aborts a connection.')

add('TCP three-way handshake',
    'Both endpoints must announce their initial sequence number and confirm receipt of the other\'s. Example with client sequence 1000 and server sequence 5000:',
    '@mono Client                         Server\n   |--- SYN, seq=1000 ----------->|\n   |<-- SYN+ACK, seq=5000, --------|\n   |             ack=1001         |\n   |--- ACK, seq=1001, ack=5001 -->|',
    '<b>Step 1:</b> The client sends SYN and enters SYN-SENT. <b>Step 2:</b> The server acknowledges it, announces its own number and enters SYN-RECEIVED. <b>Step 3:</b> The client acknowledges the server; both can reach ESTABLISHED.',
    '<b>Why three steps?</b> The third message confirms that the server\'s reply reached the client and helps reject stale connection attempts. Two messages would leave that confirmation missing.',
    'SYN consumes one sequence number; a pure ACK does not. Lost SYN/SYN + ACK messages are retransmitted. The handshake creates connection state; it does not itself provide encryption or authentication.')

add('TCP compared with UDP',
    '<b>Headers:</b> TCP: minimum 20 bytes (up to 60 with options), including ports, sequence/ACK numbers, flags, window and checksum. UDP: 8 bytes, containing ports, length and checksum.',
    '<b>Reliability:</b> TCP acknowledges, retransmits and delivers ordered bytes. UDP preserves datagram boundaries but provides no built-in delivery, ordering or duplicate guarantee.',
    '<b>Connection management:</b> TCP uses a handshake and maintains state; FIN/ACK closes it. UDP has no protocol-level connection setup or close.',
    '<b>Control:</b> TCP supplies receiver flow control and network congestion control. UDP applications or higher protocols must provide suitable controls themselves.',
    '<b>Overhead:</b> UDP has a smaller header and no built-in handshake/retries. TCP adds state and recovery traffic. With 100 bytes of data and a 20-byte IPv4 header, totals are TCP 140 bytes and UDP 128 bytes, excluding link framing.',
    '<b>Uses:</b> TCP: SSH, email, HTTP/1.1 and HTTP/2. UDP: many DNS queries, voice/video and games. QUIC adds reliable transport over UDP for HTTP/3.')

add('TCP congestion control',
    'In this <b>classical Reno</b> explanation, cwnd limits network load, rwnd protects the receiver, and ssthresh separates growth phases. MSS is the maximum segment payload size.',
    '<b>Slow Start:</b> cwnd grows roughly exponentially per RTT as new data is acknowledged. Illustrative sequence: 1, 2, 4, 8 MSS. Actual initial windows and ACK patterns can differ.',
    '<b>Congestion Avoidance:</b> At the threshold, growth becomes about 1 MSS per RTT. Per ACK, the approximate increase is MSS × MSS / cwnd.',
    '<b>Fast Retransmit:</b> Three duplicate ACKs trigger retransmission of the likely missing segment before its timer expires.',
    '<b>Fast Recovery:</b> Set ssthresh = max(flight size / 2, 2 MSS), then cwnd = ssthresh + 3 MSS. Further duplicate ACKs temporarily increase cwnd. In the single-loss case, an ACK covering recovery returns cwnd to ssthresh.',
    '<b>Timeout:</b> Reduce ssthresh, reset cwnd to 1 MSS under the classical rule, back off the timer and restart slow start. Modern congestion-control algorithms may use different rules.')

add('Go-Back-N and Selective Repeat ARQ',
    'Both use sequence numbers, ACKs and retransmissions, and allow several frames in flight through a sliding window.',
    '<b>Go-Back-N (GBN):</b> The receiver accepts only the next expected frame and discards out-of-order frames. ACKs are cumulative. On timeout, the sender repeats the oldest unacknowledged frame and all later outstanding frames. Receiver window = 1; buffering and control are simpler.',
    '<b>Selective Repeat (SR):</b> The receiver buffers valid out-of-order frames and acknowledges them selectively. The sender retries only frames needing recovery, with individual status/timers. This saves bandwidth but needs more memory and bookkeeping.',
    '<b>Example:</b> Send frames 1–4 and lose frame 2. Assuming successful ACKs/retries, GBN repeats 2, 3, 4: 7 total sends. SR repeats only 2: 5 sends.',
    '<b>Window limits:</b> With m sequence bits, GBN sender window ≤ 2<super>m</super> − 1. Equal SR windows must be ≤ 2<super>m−1</super> to avoid old/new frame ambiguity. Both recover errors; SR is usually more efficient on lossy, long-delay links.')

add('Medium for factory buildings 2 km apart',
    '<b>Recommendation:</b> Optical fiber, preferably single-mode fiber with optical transceivers rated for the required speed and 2 km distance.',
    '<b>Attenuation:</b> Fiber supports kilometer-scale links with low loss. A typical twisted-pair Ethernet channel is limited to about 100 m, so a direct 2 km run is unsuitable.',
    '<b>Noise immunity:</b> Light signals are immune to electromagnetic interference from motors and power cables. All-dielectric fiber also electrically isolates the buildings.',
    '<b>Bandwidth:</b> Appropriate fiber and optics support high data rates and future upgrades. Capacity depends on the selected transceivers and distance rating.',
    '<b>Cost:</b> Optics, termination and installation can cost more initially, but long reach avoids intermediate powered repeaters and improves reliability.',
    '<b>Arrangement:</b> Switch A → optical fiber → Switch B. Allow for connector/splice losses and a safety margin in the optical link budget.')

add('Multiplexing four voice/data channels',
    '<b>FDM:</b> Assign channels A, B, C and D separate frequency bands. They transmit simultaneously, and receiver filters separate them.',
    '<b>Guard bands:</b> Unused frequency gaps reduce adjacent-channel interference caused by imperfect filtering. For channel bandwidth B and three internal gaps g: total allocation = 4B + 3g. Example: B = 4 kHz and g = 1 kHz gives 19 kHz.',
    '<b>TDM:</b> On a digital link, allocate repeating time slots A | B | C | D. Each source takes its turn at the full link rate; voice is digitized first if necessary.',
    '<b>Time separation:</b> Synchronized slots prevent overlap; guard times may accommodate timing uncertainty. Guard time is a time gap, whereas a guard band is a frequency gap.',
    'Four 64 kbit/s sources need at least 256 kbit/s of payload capacity plus overhead. Use FDM for simultaneous separate bands or TDM for coordinated digital channels. Fixed TDM slots can waste capacity when a source is idle.')

add('NRZ, NRZI and Manchester for 1011001',
    '<b>NRZ-L:</b> Use 1 = high (H), 0 = low (L). Levels: H L H H L L H. Simple, but long identical runs provide no timing transitions.',
    '<b>NRZI:</b> Start at L; toggle at each 1 and keep the level for 0. Levels: H H L H H H L. Relative changes tolerate polarity inversion, but long zero runs lose clock transitions.',
    '<b>Manchester:</b> Use 1 = LH and 0 = HL. Half-bit pairs: LH | HL | LH | LH | HL | HL | LH. A midpoint transition enables clock recovery, at the cost of greater signaling bandwidth.',
    '@waveforms',
    'Conventions are stated explicitly because opposite polarity conventions are also used. Time increases to the right; vertical dotted lines mark bit boundaries.')

add('Pure ALOHA and Slotted ALOHA',
    '<b>Pure ALOHA:</b> Send whenever data is ready. Overlapping packets collide; retransmit after random backoff. For packet duration T, the vulnerable period is 2T.',
    '<b>Slotted ALOHA:</b> Transmit only at synchronized slot boundaries. The vulnerable period is T, reducing opportunities for collision.',
    '<b>Ideal throughput:</b> With offered attempt load G (including retries), Pure: S = G e<super>−2G</super>; Slotted: S = G e<super>−G</super>.',
    'Pure peaks at G = 0.5: S = 1/(2e) ≈ <b>18.4%</b>. Slotted peaks at G = 1: S = 1/e ≈ <b>36.8%</b>.',
    '<b>Recommendation:</b> Slotted ALOHA is more efficient if sensors can maintain common timing; its ideal maximum throughput is twice that of Pure ALOHA.',
    '<b>Assumptions:</b> Equal packet lengths, synchronized slots, independent Poisson attempts and loss of overlapping packets. Real timing errors, capture effects and synchronization overhead can change performance.')

add('Ethernet collision detection and Wi-Fi avoidance',
    '<b>Traditional shared Ethernet: CSMA/CD.</b> A station senses the cable, transmits if idle and monitors while transmitting. On collision, it stops, signals the collision and retries after binary exponential backoff.',
    '<b>Why detection works:</b> A wired station can detect the electrical effect of simultaneous transmission. Example: computers sharing an old half-duplex Ethernet hub. Modern full-duplex switched Ethernet does not use CSMA/CD.',
    '<b>Wi-Fi: CSMA/CA.</b> A radio\'s strong transmitted signal masks weak incoming signals, so it cannot reliably detect collisions while sending. Hidden terminals may hear the access point without hearing each other.',
    '<b>Avoidance:</b> Wait for idle medium, apply interframe waiting and random backoff, freeze the counter while busy, then transmit. A missing unicast ACK leads to retry. Optional RTS/CTS helps with hidden terminals.',
    '<b>Scenario:</b> Classroom laptops sharing an access point use collision avoidance. Carrier sensing and backoff reduce collisions but cannot eliminate them.')

add('CRC for data 1101011011 and generator 10011',
    'The generator has degree 4, so append four zeros. Divide using modulo-2 arithmetic: subtraction is XOR, with no carries or borrows.',
    '@mono Data + zeros: 11010110110000\nXOR 10011000000000 -> 01001110110000\nXOR 01001100000000 -> 00000010110000\nXOR 00000010011000 -> 00000000101000\nXOR 00000000100110 -> 00000000001110',
    '<b>CRC remainder = 1110.</b><br/><b>Transmitted codeword = 11010110111110.</b>',
    '<b>Receiver:</b> Divide the entire received codeword by 10011 without appending zeros. Remainder 0000 means no error was detected; a nonzero remainder indicates corruption.',
    'Example: changing the last bit gives 11010110111111, with remainder 0001. CRC detects errors but does not correct them. Error patterns divisible by the generator can remain undetected.')

add('Stop-and-Wait utilization',
    '<b>Given:</b> One-way propagation T<sub>p</sub> = 20 ms; frame transmission T<sub>t</sub> = 5 ms. Assume negligible ACK transmission/processing, immediate ACKs and no errors.',
    'Each cycle includes frame transmission plus outward and return propagation:<br/><b>Cycle = T<sub>t</sub> + 2T<sub>p</sub> = 5 + 40 = 45 ms.</b>',
    '<b>Utilization U = T<sub>t</sub> / (T<sub>t</sub> + 2T<sub>p</sub>) = 5/45 = 1/9 ≈ 11.1%.</b>',
    'Timing: transmit during 0–5 ms; the final bit reaches the receiver at 25 ms; the ACK returns at 45 ms. The sender transmits for 5 ms and waits for about 40 ms.',
    '<b>Effect of more delay:</b> If T<sub>p</sub> doubles to 40 ms, U = 5/(5 + 80) ≈ 5.88%. Thus larger propagation delay lowers utilization when frame time is fixed.',
    'Pipelining improves use of the link. Under these ideal assumptions, about (T<sub>t</sub> + 2T<sub>p</sub>)/T<sub>t</sub> = 9 outstanding frames can keep the sender busy.')

add('15 packets, window 5: GBN versus SR',
    '<b>Loss rule:</b> First attempts for P4, P8 and P12 are lost. All retransmissions succeed; ACKs are never lost. Count data transmissions only.',
    '<b>GBN assumptions:</b> Conventional cumulative ACKs, receive window 1, timeout recovery and no fast retransmit. ACKs allow the sender window to fill before timeout. Complete each retry group and its ACKs before sending new packets.',
    '<b>GBN trace:</b> Send originals P1–P8; P4/P8 are lost and P5–P7 are discarded. Retry P4–P8 (5 sends). Send originals P9–P15; P12 is lost and P13–P15 are discarded. Retry P12–P15 (4 sends).',
    '<b>GBN total = 15 originals + 9 retries = 24 sends.</b>',
    '<b>SR:</b> Buffer valid out-of-order packets and retry only P4, P8 and P12. <b>Total = 15 + 3 = 18 sends.</b> This saves 6 sends (25% of the GBN total), using more buffering and control state.',
    'The exact GBN count depends on ACK/timeout timing; 24 applies to the explicit schedule above. Losing every fourth attempt, including retries, would be a different loss rule.')

add('Four equal subnets from 192.168.10.0/24',
    'Borrow 2 host bits because 2<super>2</super> = 4 subnets. New prefix: <b>/26</b>. New mask: <b>255.255.255.192</b>. Six host bits remain.',
    '<b>Each subnet:</b> 2<super>6</super> = 64 total addresses and 64 − 2 = <b>62 usable hosts</b>. Block increment = 256 − 192 = 64.',
    '@mono Network (/26)       Usable host range       Broadcast\n192.168.10.0        .1   - .62              .63\n192.168.10.64       .65  - .126             .127\n192.168.10.128      .129 - .190             .191\n192.168.10.192      .193 - .254             .255',
    'All abbreviated addresses in the table begin with <b>192.168.10</b>. For example, .65 means 192.168.10.65.',
    'All-zero host bits identify the network; all-one host bits identify the broadcast. First usable = network + 1; last usable = broadcast − 1.',
    'Check: four blocks × 64 addresses = 256, covering the original /24 without gaps or overlap.')

add('Smallest IPv4 subnet for 50 usable hosts',
    'For an ordinary IPv4 LAN, choose the smallest number of host bits h satisfying <b>2<super>h</super> − 2 ≥ 50</b>. The two reserved addresses are the network and broadcast.',
    '<b>Try h = 5:</b> 2<super>5</super> − 2 = 30 usable hosts. Prefix /27 is too small.',
    '<b>Try h = 6:</b> 2<super>6</super> − 2 = 62 usable hosts. This meets the requirement.',
    '<b>Required prefix = 32 − 6 = /26.</b><br/><b>Subnet mask = 255.255.255.192.</b>',
    '<b>Example:</b> 192.168.10.0/26 has network 192.168.10.0, usable range 192.168.10.1–192.168.10.62 and broadcast 192.168.10.63.',
    'A /27 supplies only 30 hosts; a /25 supplies 126 but allocates more addresses than necessary. Thus /26 is the smallest suitable block. After 50 allocations, 12 usable addresses remain; gateways and other infrastructure also use this pool.')

def render():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    fontdir = Path('/usr/share/fonts/truetype/dejavu')
    for name, file in [('Notes','DejaVuSans.ttf'), ('NotesBold','DejaVuSans-Bold.ttf'), ('NotesMono','DejaVuSansMono.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(fontdir / file)))
    pdfmetrics.registerFontFamily('Notes', normal='Notes', bold='NotesBold', italic='Notes', boldItalic='NotesBold')
    style = ParagraphStyle('Body', fontName='Notes', fontSize=10.2, leading=14.1, textColor='#202020')
    title_style = ParagraphStyle('Title', fontName='NotesBold', fontSize=12, leading=16)
    W,H = A4
    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle('Computer Networks — Concise Tutorial Solutions')
    c.setAuthor('')
    report = []
    def para(text, y, st=style):
        p = Paragraph(text, st)
        _, h = p.wrap(W-88, 1000)
        p.drawOn(c,44,y-h)
        return y-h-6
    for page in range(10):
        sheet = 1 if page < 5 else 2
        c.setFont('NotesBold', 12)
        c.drawString(44,H-35,'COMPUTER NETWORKS')
        c.setFont('Notes',9)
        c.drawRightString(W-44,H-35,f'Tutorial sheet {sheet} · Short notes')
        c.setStrokeColorRGB(.65,.65,.65)
        c.line(44,H-46,W-44,H-46)
        for half in range(2):
            idx = page*2+half
            number = idx%10+1
            title, blocks = Q[idx]
            top = H-64 if half == 0 else H/2-15
            floor = H/2+14 if half == 0 else 45
            c.bookmarkPage(f'q{idx+1}')
            c.addOutlineEntry(f'Sheet {sheet} · Q{number}: {title}',f'q{idx+1}',0)
            y = para(f'Q{number}. {title}',top,title_style)-3
            for block in blocks:
                if block.startswith('@mono '):
                    c.setFont('NotesMono',8.4)
                    for line in block[6:].splitlines():
                        c.drawString(48,y-10,line)
                        y -= 12
                    y -= 7
                elif block == '@waveforms':
                    start, dx = 145, 44
                    c.setFont('NotesMono',8)
                    for j,b in enumerate('1011001'):
                        c.drawCentredString(start+(j+.5)*dx,y-6,b)
                    y -= 18
                    for label,levels in [('NRZ-L',[1,0,1,1,0,0,1]),('NRZI',[1,1,0,1,1,1,0]),('Manchester',[0,1,1,0,0,1,0,1,1,0,1,0,0,1])]:
                        c.setFont('Notes',8.5)
                        c.drawString(48,y-9,label)
                        c.setDash(1,3)
                        c.setStrokeColorRGB(.75,.75,.75)
                        for j in range(8):
                            c.line(start+j*dx,y+3,start+j*dx,y-17)
                        c.setDash()
                        c.setStrokeColorRGB(0,0,0)
                        c.setLineWidth(1)
                        path=c.beginPath()
                        step=7*dx/len(levels)
                        for j,v in enumerate(levels):
                            yy=y if v else y-14
                            if j == 0: path.moveTo(start,yy)
                            else: path.lineTo(start+j*step,yy)
                            path.lineTo(start+(j+1)*step,yy)
                        c.drawPath(path)
                        y -= 29
                    y -= 2
                else:
                    y = para(block,y)
            assert y >= floor, f'Overflow: sheet {sheet}, Q{number}: {y} < {floor}'
            report.append({'sheet':sheet,'question':number,'page':page+1,'bottom':round(y,1),'limit':floor})
        c.setLineWidth(.4)
        c.setStrokeColorRGB(.75,.75,.75)
        c.line(44,H/2,W-44,H/2)
        c.setFont('Notes',8)
        c.setFillColorRGB(.4,.4,.4)
        c.drawCentredString(W/2,24,f'{page+1} / 10')
        c.setFillColorRGB(0,0,0)
        c.showPage()
    c.save()
    (ROOT/'short_notes_layout.json').write_text(json.dumps(report,indent=2))
    (ROOT/'short_notes_source.json').write_text(json.dumps(Q,ensure_ascii=False,indent=2))
    print(f'Created {OUT} ({OUT.stat().st_size:,} bytes)')

if __name__ == '__main__':
    render()
