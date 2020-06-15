import { LocalStorageTransporter } from '../src/local-storage';
import { TransporterEvents } from '../src/base';

describe('LocalTransporter', () => {
  it('integration test', async () => {
    const transporter = new LocalStorageTransporter<any>();
    const results: Array<{ event: TransporterEvents; payload?: unknown }> = [];
    transporter.on(TransporterEvents.SourceReady, data => {
      results.push(data);
    });
    transporter.on(TransporterEvents.MirrorReady, data => {
      results.push(data);
    });
    transporter.on(TransporterEvents.Start, data => {
      results.push(data);
    });
    transporter.on(TransporterEvents.SendRecord, data => {
      results.push(data);
    });
    transporter.on(TransporterEvents.AckRecord, data => {
      results.push(data);
    });
    transporter.on(TransporterEvents.RemoteControl, data => {
      results.push(data);
    });
    transporter.on(TransporterEvents.Stop, data => {
      results.push(data);
    });
    await transporter.sendSourceReady();
    await transporter.sendMirrorReady();
    await transporter.sendStart();
    await transporter.sendRecord({ id: 1 });
    await transporter.ackRecord(1);
    await transporter.sendRemoteControl({ id: 1, action: 'scroll' });
    await transporter.sendStop();
    expect(results).toEqual([
      { event: TransporterEvents.SourceReady },
      { event: TransporterEvents.MirrorReady },
      { event: TransporterEvents.Start },
      { event: TransporterEvents.SendRecord, payload: { id: 1 } },
      { event: TransporterEvents.AckRecord, payload: 1 },
      {
        event: TransporterEvents.RemoteControl,
        payload: { action: 'scroll', id: 1 },
      },
      { event: TransporterEvents.Stop },
    ]);
  });
});
