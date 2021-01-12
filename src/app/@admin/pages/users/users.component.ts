import { ACTIVE_FILTERS } from '@core/constants/filters';
import { IRegisterForm } from '@core/interfaces/register.interface';
import { USERS_LIST_QUERY } from '@graphql/operations/query/user';
import { Component, OnInit } from '@angular/core';
import { DocumentNode } from 'graphql';
import { IResultData } from '@core/interfaces/result-data.interface';
import { ITableColumns } from '@core/interfaces/table-columns.interface';
import { optionsWithDetails, userFormBasicDialog } from '@shared/alerts/alerts';
import { UsersAdminService } from './users-admin.service';
import { basicAlert } from '@shared/alerts/toasts';
import { TYPE_ALERT } from '@shared/alerts/values.config';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  query: DocumentNode = USERS_LIST_QUERY;
  context: object;
  itemsPage: number;
  resultData: IResultData;
  include: boolean;
  columns: Array<ITableColumns>;
  filterValues = ACTIVE_FILTERS.ACTIVE;
  constructor(private service: UsersAdminService) {}
  ngOnInit(): void {
    this.context = {};
    this.itemsPage = 10;
    this.resultData = {
      listKey: 'users',
      definitionKey: 'users'
    };
    this.include = true;
    this.columns = [
      {
        property: 'id',
        label: '#'
      },
      {
        property: 'name',
        label: 'Nombre'
      },
      {
        property: 'lastname',
        label: 'Apellidos'
      },
      {
        property: 'email',
        label: 'Correo electrónico'
      },
      {
        property: 'role',
        label: 'Permisos'
      },
      {
        property: 'active',
        label: '¿Activo?'
      }
    ];
  }

  private initializeForm(user: any) {
    const defaultName =
      user.name !== undefined && user.name !== '' ? user.name : '';
    const defaultLastname =
      user.lastname !== undefined && user.lastname !== '' ? user.lastname : '';
    const defaultEmail =
      user.email !== undefined && user.email !== '' ? user.email : '';
    const roles = new Array(2);
    roles[0] = user.role !== undefined && user.role === 'ADMIN' ? 'selected' : '';
    roles[1] = user.role !== undefined && user.role === 'CLIENT' ? 'selected' : '';
    return `
      <input id="name" value="${defaultName}" class="swal2-input" placeholder="Nombre" required>
      <input id="lastname" value="${defaultLastname}" class="swal2-input" placeholder="Apellidos" required>
      <input id="email" value="${defaultEmail}" class="swal2-input" placeholder="Correo Electrónico" required>
      <select id="role" class="swal2-input">
        <option value="ADMIN" ${roles[0]}>Administrador</option>
        <option value="CLIENT" ${roles[1]}>Cliente</option>
      </select>
    `;
  }
  async takeAction($event) {
    // Coger la información para las acciones
    const action = $event[0];
    const user = $event[1];
    // Cogemos el valor por defecto
    const html = this.initializeForm(user);
    switch (action) {
      case 'add':
        // Añadir el item
        this.addForm(html);
        break;
      case 'edit':
        this.updateForm(html, user);
        break;
      case 'info':
        const result = await optionsWithDetails(
          'Detalles',
          `${user.name} ${user.lastname}<br/>
          <i class="fas fa-envelope-open-text"></i>&nbsp;&nbsp;${user.email}`,
          (user.active !== false) ? 375 : 400,
          '<i class="fas fa-edit"></i> Editar', // true
          (user.active !== false) ?
          '<i class="fas fa-lock"></i> Bloquear' :
          '<i class="fas fa-unlock"></i> Desbloquear'
        ); // false
        if (result) {
          this.updateForm(html, user);
        } else if (result === false) {
          this.unblockForm(user, user.active);
        }
        break;
      case 'block':
        this.unblockForm(user, false);
        break;
      case 'unblock':
          this.unblockForm(user, true);
          break;
      default:
        break;
    }
  }

  private async addForm(html: string) {
    const result = await userFormBasicDialog('Añadir usuario', html);
    console.log(result);
    this.addUser(result);
  }

  private addUser(result) {
    if (result.value) {
      const user: IRegisterForm = result.value;
      user.password = '1234';
      user.active = false;
      this.service.register(user).subscribe((res: any) => {
        if (res.status) {
          const createUser = res.user;
          basicAlert(TYPE_ALERT.SUCCESS, res.message);
          // Especificar acción para enviar email de activación al usuario
          this.service.sendEmailActive(createUser.id, createUser.email).subscribe((emailRes: any) => {
            basicAlert((emailRes.status) ?
                        TYPE_ALERT.SUCCESS :
                        TYPE_ALERT.WARNING, emailRes.message);
          });
          return;
        }
        basicAlert(TYPE_ALERT.WARNING, res.message);
      });
    }
  }

  private async updateForm(html: string, user: any) {
    const result = await userFormBasicDialog('Modificar usuario', html);
    console.log(result);
    this.updateUser(result, user.id);
  }

  private updateUser(result, id: string) {
    if (result.value) {
      const user = result.value;
      user.id = id;
      console.log(user);
      this.service.update(result.value).subscribe((res: any) => {
        console.log(res);
        if (res.status) {
          basicAlert(TYPE_ALERT.SUCCESS, res.message);
          return;
        }
        basicAlert(TYPE_ALERT.WARNING, res.message);
      });
    }
  }

  private async unblockForm(user: any, unblock: boolean) {
    const result =
    (unblock) ?
    await optionsWithDetails(
      '¿Desbloquear?',
      `Si desbloqueas el usuario seleccionado, podrás comprar y realizar otras gestiones dentro de la tienda`,
      490,
      'No, no desbloquear',
      'Si, desbloquear'
    ) :
    await optionsWithDetails(
      '¿Bloquear?',
      `Si bloqueas el usuario seleccionado, no se mostrará en la lista`,
      430,
      'No, no bloquear',
      'Si, bloquear'
    );

    if (result === false) {
      // Si resultado falso, queremos bloquear
      this.unblockUser(user.id, unblock);
    }
  }

  private unblockUser(id: string, unblock: boolean) {
    this.service.unblock(id, unblock, true).subscribe((res: any) => {
      console.log(res);
      if (res.status) {
        basicAlert(TYPE_ALERT.SUCCESS, res.message);
        return;
      }
      basicAlert(TYPE_ALERT.WARNING, res.message);
    });
  }

}
