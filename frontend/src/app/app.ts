import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { UpdateNotificationComponent } from './shared/components/pwa/update-notification.component';
import { InstallPromptBannerComponent } from './shared/components/pwa/install-prompt-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, ToastComponent, UpdateNotificationComponent, InstallPromptBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
